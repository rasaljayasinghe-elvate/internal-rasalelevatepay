import { CheckInput, Select, TextArea, TextInput } from "@/components/fields";
import {
  BOOKING_STATUS_LABEL,
  CAMPAIGN_STATUS_LABEL,
  DELIVERABLE_STATUS_LABEL,
  FORMAT_LABEL,
  INVOICE_STATUS_LABEL,
  PAYMENT_STATUS_LABEL,
  PLATFORM_LABEL,
} from "@/lib/campaigns";
import type { schema } from "@/lib/db";

type Campaign = typeof schema.campaigns.$inferSelect;
type Booking = typeof schema.campaignCreators.$inferSelect;
type Deliverable = typeof schema.deliverables.$inferSelect;

export function CampaignFields({ campaign }: { campaign?: Campaign }) {
  return (
    <div className="grid gap-4 sm:grid-cols-4">
      <TextInput label="Name" name="name" required defaultValue={campaign?.name} placeholder="e.g. Sri Lanka creators · Oct 2026" className="sm:col-span-2" />
      <Select label="Status" name="status" options={CAMPAIGN_STATUS_LABEL} defaultValue={campaign?.status ?? "planning"} />
      <div />
      <TextInput label="Start date" name="startDate" type="date" defaultValue={campaign?.startDate ?? ""} />
      <TextInput label="End date" name="endDate" type="date" defaultValue={campaign?.endDate ?? ""} />
      <TextInput
        label="Metricool brand id"
        name="metricoolBlogId"
        defaultValue={campaign?.metricoolBlogId ?? ""}
        hint="The blogId in the Metricool brand URL."
        className="sm:col-span-2"
      />
      <TextArea label="Notes" name="notes" defaultValue={campaign?.notes ?? ""} className="sm:col-span-4" />
    </div>
  );
}

export function BookingFields({ booking }: { booking: Booking }) {
  return (
    <div className="grid gap-3 sm:grid-cols-5">
      <Select label="Status" name="status" options={BOOKING_STATUS_LABEL} defaultValue={booking.status} />
      <TextInput label="Agreed LKR" name="agreedLkr" inputMode="decimal" defaultValue={booking.agreedLkr ?? ""} />
      <TextInput label="Signups" name="signups" inputMode="numeric" defaultValue={booking.signups ?? ""} />
      <TextInput label="KYC completions" name="kycCompletions" inputMode="numeric" defaultValue={booking.kycCompletions ?? ""} />
      <TextInput label="First deposits" name="firstDeposits" inputMode="numeric" defaultValue={booking.firstDeposits ?? ""} />
      <TextArea label="Notes" name="notes" rows={2} defaultValue={booking.notes ?? ""} className="sm:col-span-5" />
    </div>
  );
}

export function LodgeFields({ booking }: { booking: Booking }) {
  return (
    <div className="grid gap-3 sm:grid-cols-4">
      <div className="flex flex-col justify-end gap-2 sm:col-span-4 sm:flex-row sm:items-center">
        <CheckInput label="Brief sent" name="briefSent" defaultChecked={booking.briefSent} />
        <CheckInput label="Draft approved" name="draftApproved" defaultChecked={booking.draftApproved} />
        <CheckInput label="Posted" name="posted" defaultChecked={booking.posted} />
      </div>
      <TextInput label="Go-live" name="goLiveDate" type="date" defaultValue={booking.goLiveDate ?? ""} />
      <Select
        label="Invoice"
        name="invoiceStatus"
        options={INVOICE_STATUS_LABEL}
        defaultValue={booking.invoiceStatus}
      />
      <Select
        label="Payment"
        name="paymentStatus"
        options={PAYMENT_STATUS_LABEL}
        defaultValue={booking.paymentStatus ?? ""}
      />
      <TextInput label="Paid date" name="paidDate" type="date" defaultValue={booking.paidDate ?? ""} />
      <TextInput label="Payment ref" name="paymentRef" defaultValue={booking.paymentRef ?? ""} />
      <TextInput
        label="Email thread"
        name="emailUrl"
        defaultValue={booking.emailUrl ?? ""}
        className="sm:col-span-3"
      />
      <TextArea
        label="What was agreed"
        name="deliverableSummary"
        rows={2}
        defaultValue={booking.deliverableSummary ?? ""}
        className="sm:col-span-4"
      />
      <TextArea label="Notes" name="notes" rows={2} defaultValue={booking.notes ?? ""} className="sm:col-span-4" />
    </div>
  );
}

export function DeliverableFields({ deliverable }: { deliverable?: Deliverable }) {
  return (
    <div className="grid gap-3 sm:grid-cols-4">
      <Select label="Platform" name="platform" options={PLATFORM_LABEL} defaultValue={deliverable?.platform ?? "instagram"} />
      <Select label="Format" name="format" options={FORMAT_LABEL} defaultValue={deliverable?.format ?? "reel"} />
      <Select label="Status" name="status" options={DELIVERABLE_STATUS_LABEL} defaultValue={deliverable?.status ?? "planned"} />
      <TextInput label="Due" name="dueDate" type="date" defaultValue={deliverable?.dueDate ?? ""} />
      <TextInput label="Post link" name="postUrl" defaultValue={deliverable?.postUrl ?? ""} className="sm:col-span-2" />
      <TextInput label="Insights link" name="insightsUrl" defaultValue={deliverable?.insightsUrl ?? ""} placeholder="Screenshot or Drive link" className="sm:col-span-2" />
      <TextInput label="Views" name="views" inputMode="decimal" defaultValue={deliverable?.views ?? ""} placeholder="e.g. 48k" />
      <TextInput label="Likes" name="likes" inputMode="decimal" defaultValue={deliverable?.likes ?? ""} />
      <TextInput label="Comments" name="comments" inputMode="decimal" defaultValue={deliverable?.comments ?? ""} />
    </div>
  );
}
