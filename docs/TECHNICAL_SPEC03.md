# WanderMate — Technical Specification
## Part 03: Booking State Machine

> The booking lifecycle is the core business logic of the platform. This document defines every valid state, who can transition between states, what validation runs, and what side effects fire (WhatsApp, emails, payments).

---

## 1. State Diagram

```
                         ┌─────────┐
                    ┌───►│ DECLINED│◄──┐
                    │    │(terminal)│   │
                    │    └─────────┘   │
                    │                  │
┌────────┐    ┌────┴────┐        ┌────┴────┐
│ DRAFT  ├───►│ PENDING ├────────┤CONFIRMED│
│        │    │         │ accept │         │
└────────┘    └────┬────┘        └────┬────┘
                   │                  │
              ┌────┴────┐        ┌────┴────┐
              │CANCELLED│        │IN_PROG  │
              │(terminal)│       │         │
              └─────────┘        └────┬────┘
                                      │
                                 ┌────┴────┐
                                 │COMPLETED│
                                 │         │
                                 └────┬────┘
                                      │
                                 ┌────┴────┐
                                 │ REVIEWED│
                                 │(terminal)│
                                 └─────────┘

Additional terminal states:
  • DISPUTED ──► resolved to COMPLETED or CANCELLED
```

**Terminal states** (no further transitions): `declined`, `cancelled`, `reviewed`

---

## 2. State Definitions

| State | Description | Visibility |
|-------|-------------|------------|
| `draft` | Tourist is building the booking but has not submitted it. Exists only in their session/device. | Tourist only |
| `pending` | Booking submitted. Guide/driver receives WhatsApp alert. Awaiting response. | Tourist, assigned guide/driver, admin |
| `confirmed` | Guide/driver accepted. Tourist receives confirmation. Date is locked. | All parties |
| `in_progress` | System auto-transition on the experience date. Guide/driver can mark arrived. | All parties |
| `completed` | Experience finished. Tourist prompted to leave review. | All parties |
| `reviewed` | Tourist submitted review. Booking archived. | All parties |
| `declined` | Guide/driver rejected or did not respond in time. Terminal state. | Tourist, admin |
| `cancelled` | Cancelled by tourist, guide, or admin. Terminal state. | All parties |
| `disputed` | Problem reported. Admin intervention required. Can resolve to `completed` or `cancelled`. | Admin + involved parties |

---

## 3. Valid Transitions

### 3.1 Transition Matrix

| From → To | Triggered By | Conditions | Side Effects |
|-----------|--------------|------------|--------------|
| `draft` → `pending` | Tourist submits | All required fields filled; `travel_date` ≥ today | WhatsApp to guide/driver; Create notification log; Lock availability |
| `pending` → `confirmed` | Guide/Driver accepts | Within response window (48h); Date still available | WhatsApp to tourist; Email backup; Update calendar |
| `pending` → `declined` | Guide/Driver declines | Any time before `confirmed` | WhatsApp to tourist with reason; Re-open tourist search |
| `pending` → `cancelled` | Tourist cancels | Before guide/driver responds | No charge; Soft delete draft |
| `confirmed` → `in_progress` | System cron | `travel_date` == today AND `start_time` passed | WhatsApp reminder to tourist (pickup pin); Notify guide/driver |
| `confirmed` → `cancelled` | Tourist cancels | > 24h before `travel_date` | WhatsApp to guide/driver; Release calendar slot |
| `confirmed` → `cancelled` | Guide/Driver cancels | Any time (penalty flag) | WhatsApp to tourist; Admin flag; Re-match tourist |
| `in_progress` → `completed` | Guide/Driver marks done | Manual action after experience | WhatsApp review prompt to tourist; Release final payment hold (Phase 2) |
| `in_progress` → `disputed` | Tourist reports issue | Within 24h of experience end | Admin alert; Pause payout (Phase 2) |
| `completed` → `reviewed` | System | Tourist submits review OR 14 days pass | If no review, auto-close; Update cached ratings |
| `completed` → `disputed` | Tourist reports issue | Within 7 days of completion | Admin alert |
| `disputed` → `completed` | Admin resolves | Investigation complete, no refund needed | Resume normal flow |
| `disputed` → `cancelled` | Admin resolves | Investigation complete, refund issued | Issue refund (Phase 2); Close booking |
| `declined` → `pending` | System/Tourist | Tourist selects new guide/driver from match list | Re-send WhatsApp to new provider |

### 3.2 Invalid Transitions (Blocked)

These transitions are **never allowed** and return HTTP 422:

| Invalid Transition | Why Blocked |
|--------------------|-------------|
| `draft` → anything except `pending` | Must submit to leave draft |
| `draft` → `cancelled` | Nothing to cancel |
| `pending` → `in_progress` | Must confirm first |
| `pending` → `completed` | Must confirm first |
| `declined` → `confirmed` | Declined is terminal; create new booking |
| `cancelled` → any state | Cancelled is terminal |
| `reviewed` → any state | Reviewed is terminal |
| `confirmed` → `pending` | Cannot un-confirm |
| `completed` → `in_progress` | Cannot go backwards |
| `in_progress` → `pending` | Cannot go backwards |

---

## 4. Business Rules Per Transition

### 4.1 `draft` → `pending`: Submit Booking

**Validation Rules:**
```
REQUIRED:
  • city_id matches active city in URL
  • tourist_id == current authenticated user
  • travel_date >= TODAY
  • travel_date <= TODAY + 365 days (max 1 year ahead)
  • group_size >= 1
  • group_size <= activity.max_group_size (if activity booking)
  • At least one provider assigned: guide_id OR driver_id

CONDITIONAL BY TYPE:
  activity:      activity_id IS NOT NULL
  package:       package_id IS NOT NULL
  guide_hourly:  duration_hours >= 2
  driver_hourly: duration_hours >= 2
  driver_distance: distance_radius_km IS NOT NULL
  driver_own_car: tourist_has_vehicle = true
  surprise_me:   interests IS NOT NULL AND array_length >= 1
```

**Side Effects:**
1. Insert `booking` row with `status = 'pending'`
2. Insert `booking_status_log` row (`previous = NULL`, `new = pending`)
3. Insert `notification` row (`type = 'booking_request'`, `channel = 'whatsapp'`)
4. Call WhatsApp API route to send message to guide/driver
5. Block guide/driver calendar for `travel_date` (soft hold, not confirmed)

**Race Condition Handling:**
- Two tourists book the same guide for the same date simultaneously
- Solution: Database `UNIQUE` constraint on `(guide_id, travel_date)` for `confirmed` bookings only
- `pending` bookings use advisory locks; second submit gets "This guide is being booked by someone else" message

---

### 4.2 `pending` → `confirmed`: Accept Booking

**Who Can Trigger:**
- Guide (if `guide_id` is set and they own it)
- Driver (if `driver_id` is set and they own it)
- City admin or super admin (override)

**Validation Rules:**
```
REQUIRED:
  • Current user == guide.profile_id OR driver.profile_id OR admin
  • status == 'pending'
  • travel_date >= TODAY (cannot confirm past dates)
  • No existing CONFIRMED booking for same provider + date

AUTO-TRANSITION RULES:
  • If no response within 48h → auto-decline (cron job)
  • If tourist cancels before guide responds → transition to cancelled
```

**Side Effects:**
1. Update `bookings.status = 'confirmed'`
2. Insert status log
3. Insert notification (`type = 'booking_confirmed'`)
4. WhatsApp confirmation to tourist with pickup details
5. Hard-block calendar (confirmed slot)
6. If Phase 2: Create Stripe payment intent for deposit

---

### 4.3 `pending` → `declined`: Decline Booking

**Who Can Trigger:** Guide, driver, or admin. Tourist CANNOT decline their own pending booking (they cancel instead).

**Validation Rules:**
```
REQUIRED:
  • Current user == assigned provider OR admin
  • status == 'pending'
```

**Side Effects:**
1. Update `bookings.status = 'declined'`
2. Insert status log with `notes = decline_reason`
3. Insert notification (`type = 'booking_declined'`)
4. WhatsApp to tourist: "Your guide is not available. Choose another?"
5. Release calendar soft-hold
6. If tourist has other matched guides, offer re-routing

---

### 4.4 `pending` → `cancelled`: Cancel Before Confirmation

**Who Can Trigger:** Tourist only (they created it).

**Side Effects:**
1. Update `bookings.status = 'cancelled'`
2. `cancelled_by = tourist_id`
3. `cancellation_reason = 'Tourist cancelled before confirmation'`
4. Release calendar hold
5. No WhatsApp needed (guide/driver hasn't committed)

---

### 4.5 `confirmed` → `in_progress`: Experience Starts

**Who Can Trigger:** System automated (cron job) OR guide/driver manual override.

**Auto-Transition Condition:**
```
CURRENT_DATE == bookings.travel_date 
AND CURRENT_TIME >= bookings.start_time - INTERVAL '30 minutes'
```

**Manual Override:**
- Guide/driver can mark "arrived early" via dashboard
- Admin can force transition

**Side Effects:**
1. Update `bookings.status = 'in_progress'`
2. Insert status log
3. WhatsApp to tourist: "Your experience is starting! Pickup at [address] [map pin]"
4. If Phase 2 + mobile app: Enable live location sharing

---

### 4.6 `confirmed` → `cancelled`: Cancel After Confirmation

**Tourist Cancellation:**
```
ALLOWED IF: NOW() < travel_date - INTERVAL '24 hours'
PENALTY: None in Phase 1. In Phase 2: lose deposit.
```

**Guide/Driver Cancellation:**
```
ALLOWED: Any time, but counts against reliability score
PENALTY: Phase 1 = admin flag. Phase 2 = payout blocked, account review.
FALLBACK: Platform re-matches tourist with alternate provider.
```

**Side Effects:**
1. Update `bookings.status = 'cancelled'`
2. Record `cancelled_by` and `cancellation_reason`
3. Insert status log
4. WhatsApp to all parties
5. Release calendar block
6. If Phase 2: Process refund if applicable

---

### 4.7 `in_progress` → `completed`: Experience Ends

**Who Can Trigger:**
- Guide/driver marks as complete via dashboard
- System auto-completes 4 hours after `start_time + duration_hours`
- Admin override

**Side Effects:**
1. Update `bookings.status = 'completed'`
2. `completed_at = NOW()`
3. Insert status log
4. WhatsApp to tourist: "How was your experience? Leave a review: [link]"
5. If Phase 2: Release balance payment to guide/driver (minus commission)

---

### 4.8 `completed` → `reviewed`: Review Submitted

**Who Can Trigger:** Tourist submits review OR system auto-closes after 14 days.

**Validation Rules:**
```
REQUIRED:
  • reviewer_id == bookings.tourist_id
  • rating BETWEEN 1 AND 5
  • text IS NULL OR length(text) <= 2000
  • array_length(photos) <= 5
```

**Side Effects:**
1. Insert `reviews` row
2. Trigger recalculates `avg_rating` and `review_count` on guide/driver/activity
3. Update `bookings.status = 'reviewed'`
4. Insert status log
5. If review is 5-star + has photos: Flag for "featured review" admin queue

---

### 4.9 Any Active State → `disputed`: Report Problem

**Who Can Trigger:** Tourist only.

**Valid From:**
- `in_progress`: During or immediately after experience
- `completed`: Within 7 days of completion

**Not Valid From:** `draft`, `pending`, `declined`, `cancelled`, `reviewed`

**Side Effects:**
1. Update `bookings.status = 'disputed'`
2. Insert status log with `notes = dispute_reason`
3. Insert notification (`type = 'booking_disputed'`) to admin
4. Email + dashboard alert to city admin
5. If Phase 2: Hold payout pending resolution

---

## 5. Response Timeouts & SLA

| State | Timeout | Auto-Action |
|-------|---------|-------------|
| `pending` | 48 hours | Auto-decline + notify tourist |
| `confirmed` → `in_progress` | Start time + 2 hours | Auto-mark `in_progress` (assume guide started) |
| `in_progress` | Start time + duration + 4 hours | Auto-mark `completed` |
| `completed` | 14 days | Auto-close to `reviewed` (no review) |
| `disputed` | 7 days | Escalate to super admin |

**Implementation:** Daily cron job (scheduled via `pg_cron`, `node-cron`, or an external scheduler calling a Next.js API route).

---

## 6. State Transition API (Pseudo-Code)

```typescript
// POST /api/bookings/[id]/transition
// Body: { to_status: 'confirmed', note?: string }

async function transitionBooking(bookingId, toStatus, note, currentUser) {
  // 1. Fetch booking with current status
  const booking = await db.bookings.findById(bookingId);
  
  // 2. Validate transition is allowed
  if (!isValidTransition(booking.status, toStatus)) {
    throw new Error(`Invalid transition: ${booking.status} → ${toStatus}`);
  }
  
  // 3. Validate user has permission
  if (!canTriggerTransition(booking, toStatus, currentUser)) {
    throw new Error('Unauthorized');
  }
  
  // 4. Run business rules validation
  await validateBusinessRules(booking, toStatus);
  
  // 5. Execute transition in transaction
  await db.transaction(async (trx) => {
    // Update booking
    await trx.bookings.update(bookingId, { 
      status: toStatus,
      updated_at: new Date()
    });
    
    // Log the change
    await trx.booking_status_logs.create({
      booking_id: bookingId,
      previous_status: booking.status,
      new_status: toStatus,
      changed_by: currentUser.id,
      notes: note
    });
    
    // Side effects
    await executeSideEffects(booking, toStatus, trx);
  });
  
  return { success: true, new_status: toStatus };
}
```

---

## 7. Edge Cases & Failure Modes

### 7.1 Double-Accept Race Condition
Two guides accept the same booking simultaneously. 
**Fix:** `UPDATE bookings SET status = 'confirmed' WHERE id = ? AND status = 'pending'` — only one succeeds.

### 7.2 Guide Cancels After Tourist Already Left
Tourist is en route, guide cancels. 
**Fix:** Block `confirmed` → `cancelled` by guide if `travel_date == today` AND `start_time - 2 hours <= NOW()`. Requires admin override.

### 7.3 Tourist Books Past Date
Client-side validation can be bypassed. 
**Fix:** Database CHECK constraint: `travel_date >= CURRENT_DATE` on `pending` and `confirmed` inserts.

### 7.4 No-Show by Guide
Tourist shows up, guide doesn't. 
**Flow:** Tourist calls/WhatsApps guide → if no response after 30 min → tourist marks "guide no-show" in app → status → `disputed` → admin介入 → refund + penalty.

### 7.5 Duplicate Review
Tourist refreshes and submits review twice. 
**Fix:** `UNIQUE` constraint on `reviews.booking_id`.

---

## 8. Dashboard Views by State

### Tourist Dashboard
| Tab | Query |
|-----|-------|
| Upcoming | `status IN ('confirmed', 'in_progress') AND travel_date >= TODAY` |
| Pending | `status = 'pending'` |
| Past | `status IN ('completed', 'reviewed', 'cancelled', 'declined')` |
| Needs Review | `status = 'completed'` (prompt to review) |

### Guide/Driver Dashboard
| Tab | Query |
|-----|-------|
| New Leads | `status = 'pending'` |
| Confirmed | `status = 'confirmed'` |
| Today | `status = 'in_progress' OR (status = 'confirmed' AND travel_date = TODAY)` |
| History | `status IN ('completed', 'reviewed', 'cancelled', 'declined')` |

---

*Next: The actual SQL migration file implements all tables, enums, indexes, constraints, and triggers defined in Part 02 and Part 03.*
