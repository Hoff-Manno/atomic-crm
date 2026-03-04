import { CRM } from "@/components/atomic-crm/root/CRM";

const App = () => (
  <CRM
    title="Layaway Depot NZ"
    disableTelemetry
    companySectors={[
      { value: "electronics-supplier", label: "Electronics Supplier" },
      { value: "appliance-supplier", label: "Appliance Supplier" },
      { value: "furniture-supplier", label: "Furniture Supplier" },
      { value: "clothing-supplier", label: "Clothing Supplier" },
      { value: "general-retail", label: "General Retail" },
      { value: "warehouse", label: "Warehouse / Storage" },
      { value: "store-location", label: "Store Location" },
      { value: "other", label: "Other" },
    ]}
    dealStages={[
      { value: "new", label: "New Layby" },
      { value: "deposit-paid", label: "Deposit Paid" },
      { value: "in-progress", label: "Payments In Progress" },
      { value: "paid-in-full", label: "Paid In Full" },
      { value: "collected", label: "Collected" },
      { value: "cancelled", label: "Cancelled" },
      { value: "defaulted", label: "Defaulted" },
    ]}
    dealPipelineStatuses={["collected"]}
    dealCategories={[
      { value: "electronics", label: "Electronics" },
      { value: "appliances", label: "Appliances" },
      { value: "furniture", label: "Furniture" },
      { value: "clothing", label: "Clothing & Footwear" },
      { value: "jewelry", label: "Jewelry & Watches" },
      { value: "sports", label: "Sports & Outdoors" },
      { value: "toys", label: "Toys & Games" },
      { value: "homewares", label: "Homewares" },
      { value: "other", label: "Other" },
    ]}
    noteStatuses={[
      { value: "enquiry", label: "Enquiry", color: "#7dbde8" },
      { value: "active", label: "Active", color: "#a4e87d" },
      { value: "overdue", label: "Overdue", color: "#e88b7d" },
      { value: "completed", label: "Completed", color: "#b0b0b0" },
    ]}
    taskTypes={[
      { value: "none", label: "None" },
      { value: "payment-reminder", label: "Payment Reminder" },
      { value: "follow-up-call", label: "Follow-up Call" },
      { value: "collection-ready", label: "Collection Ready" },
      { value: "contract-review", label: "Contract Review" },
      { value: "overdue-notice", label: "Overdue Notice" },
      { value: "refund", label: "Process Refund" },
      { value: "call", label: "Phone Call" },
      { value: "email", label: "Email" },
    ]}
  />
);

export default App;
