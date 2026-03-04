import { useRecordContext, WithRecord } from "ra-core";
import { ArrayField } from "@/components/admin/array-field";
import { SingleFieldList } from "@/components/admin/single-field-list";
import { TextField } from "@/components/admin/text-field";
import { EmailField } from "@/components/admin/email-field";
import { Mail, Phone, MessageSquare, Cake } from "lucide-react";
import type { ReactNode } from "react";
import { contactGender } from "./contactGender";
import type { Contact } from "../types";

export const ContactPersonalInfo = () => {
  const record = useRecordContext<Contact>();

  if (!record) return null;

  return (
    <div>
      <ArrayField source="email_jsonb">
        <SingleFieldList className="flex-col gap-y-0">
          <PersonalInfoRow
            icon={<Mail className="w-4 h-4 text-muted-foreground" />}
            primary={<EmailField source="email" />}
          />
        </SingleFieldList>
      </ArrayField>

      {record.has_newsletter && (
        <p className="pl-6 py-1 text-sm text-muted-foreground">
          Marketing opt-in
        </p>
      )}

      <ArrayField source="phone_jsonb">
        <SingleFieldList className="flex-col gap-y-0">
          <PersonalInfoRow
            icon={<Phone className="w-4 h-4 text-muted-foreground" />}
            primary={<TextField source="number" />}
            showType
          />
        </SingleFieldList>
      </ArrayField>
      {contactGender
        .map((genderOption) => {
          if (record.gender === genderOption.value) {
            return (
              <PersonalInfoRow
                key={genderOption.value}
                icon={
                  <genderOption.icon className="w-4 h-4 text-muted-foreground" />
                }
                primary={<div>{genderOption.label}</div>}
              />
            );
          }
          return null;
        })
        .filter(Boolean)}
      {record.preferred_contact_method && (
        <PersonalInfoRow
          icon={
            <MessageSquare className="w-4 h-4 text-muted-foreground" />
          }
          primary={
            <div>
              Prefers{" "}
              {record.preferred_contact_method === "text"
                ? "Text / SMS"
                : record.preferred_contact_method.charAt(0).toUpperCase() +
                  record.preferred_contact_method.slice(1)}
            </div>
          }
        />
      )}
      {record.date_of_birth && (
        <PersonalInfoRow
          icon={<Cake className="w-4 h-4 text-muted-foreground" />}
          primary={
            <div>
              {new Date(record.date_of_birth).toLocaleDateString("en-NZ", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </div>
          }
        />
      )}
    </div>
  );
};

const PersonalInfoRow = ({
  icon,
  primary,
  showType,
}: {
  icon: ReactNode;
  primary: ReactNode;
  showType?: boolean;
}) => (
  <div className="flex flex-row items-center gap-x-2 py-1 min-h-6">
    {icon}
    <div className="flex flex-wrap gap-x-2 gap-y-0 text-sm">
      {primary}
      {showType ? (
        <WithRecord
          render={(row) =>
            row.type !== "Other" && (
              <TextField source="type" className="text-muted-foreground" />
            )
          }
        />
      ) : null}
    </div>
  </div>
);
