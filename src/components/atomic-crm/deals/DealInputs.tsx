import { required } from "ra-core";
import { AutocompleteArrayInput } from "@/components/admin/autocomplete-array-input";
import { ReferenceArrayInput } from "@/components/admin/reference-array-input";
import { ReferenceInput } from "@/components/admin/reference-input";
import { TextInput } from "@/components/admin/text-input";
import { NumberInput } from "@/components/admin/number-input";
import { DateInput } from "@/components/admin/date-input";
import { SelectInput } from "@/components/admin/select-input";
import { Separator } from "@/components/ui/separator";
import { useIsMobile } from "@/hooks/use-mobile";

import { contactOptionText } from "../misc/ContactOption";
import { useConfigurationContext } from "../root/ConfigurationContext";
import { AutocompleteCompanyInput } from "../companies/AutocompleteCompanyInput.tsx";

const paymentFrequencyChoices = [
  { id: "weekly", name: "Weekly" },
  { id: "fortnightly", name: "Fortnightly" },
  { id: "monthly", name: "Monthly" },
];

export const DealInputs = () => {
  const isMobile = useIsMobile();
  return (
    <div className="flex flex-col gap-8">
      <DealInfoInputs />

      <div className={`flex gap-6 ${isMobile ? "flex-col" : "flex-row"}`}>
        <div className="flex flex-col gap-8 flex-1">
          <DealLinkedToInputs />
          <DealItemInputs />
        </div>
        <Separator orientation={isMobile ? "horizontal" : "vertical"} />
        <div className="flex flex-col gap-8 flex-1">
          <DealPaymentInputs />
          <DealMiscInputs />
        </div>
      </div>
    </div>
  );
};

const DealInfoInputs = () => {
  return (
    <div className="flex flex-col gap-4 flex-1">
      <TextInput
        source="name"
        label="Contract name"
        validate={required()}
        helperText={false}
      />
      <TextInput source="description" multiline rows={3} helperText={false} />
    </div>
  );
};

const DealLinkedToInputs = () => {
  return (
    <div className="flex flex-col gap-4 flex-1">
      <h3 className="text-base font-medium">Linked to</h3>
      <ReferenceInput source="company_id" reference="companies">
        <AutocompleteCompanyInput validate={required()} />
      </ReferenceInput>

      <ReferenceArrayInput source="contact_ids" reference="contacts_summary">
        <AutocompleteArrayInput
          label="Customers"
          optionText={contactOptionText}
          helperText={false}
        />
      </ReferenceArrayInput>
    </div>
  );
};

const DealItemInputs = () => {
  return (
    <div className="flex flex-col gap-4 flex-1">
      <h3 className="text-base font-medium">Item details</h3>
      <TextInput
        source="item_description"
        label="Item description"
        helperText={false}
      />
      <TextInput
        source="item_held_location"
        label="Item held at"
        helperText={false}
      />
    </div>
  );
};

const DealPaymentInputs = () => {
  return (
    <div className="flex flex-col gap-4 flex-1">
      <h3 className="text-base font-medium">Payment</h3>
      <NumberInput
        source="amount"
        label="Total price"
        defaultValue={0}
        helperText={false}
        validate={required()}
      />
      <NumberInput
        source="deposit_amount"
        label="Deposit amount"
        defaultValue={0}
        helperText={false}
      />
      <SelectInput
        source="payment_frequency"
        label="Payment frequency"
        choices={paymentFrequencyChoices}
        helperText={false}
        defaultValue="weekly"
      />
      <NumberInput
        source="total_paid"
        label="Total paid so far"
        defaultValue={0}
        helperText={false}
      />
      <DateInput
        source="next_payment_date"
        label="Next payment date"
        helperText={false}
      />
    </div>
  );
};

const DealMiscInputs = () => {
  const { dealStages, dealCategories } = useConfigurationContext();
  return (
    <div className="flex flex-col gap-4 flex-1">
      <h3 className="text-base font-medium">Contract</h3>

      <SelectInput
        source="category"
        label="Category"
        choices={dealCategories}
        optionText="label"
        optionValue="value"
        helperText={false}
      />
      <DateInput
        validate={required()}
        source="expected_closing_date"
        label="Final payment date"
        helperText={false}
        defaultValue={new Date().toISOString().split("T")[0]}
      />
      <DateInput
        source="contract_end_date"
        label="Collection deadline"
        helperText={false}
      />
      <SelectInput
        source="stage"
        choices={dealStages}
        optionText="label"
        optionValue="value"
        defaultValue="new"
        helperText={false}
        validate={required()}
      />
    </div>
  );
};
