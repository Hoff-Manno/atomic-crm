import {
  company as fakerCompany,
  internet,
  lorem,
  name,
  phone,
  random,
} from "faker/locale/en_US";

import { defaultNoteStatuses } from "../../../root/defaultConfiguration";
import { contactGender } from "../../../contacts/contactGender";
import type { Company, Contact } from "../../../types";
import type { Db } from "./types";
import { randomDate, weightedBoolean } from "./utils";

const maxContacts = {
  1: 1,
  10: 4,
  50: 12,
  250: 25,
  500: 50,
};

const getRandomContactDetailsType = () =>
  random.arrayElement(["Mobile", "Home", "Work", "Other"]) as
    | "Mobile"
    | "Home"
    | "Work"
    | "Other";

const getRandomPreferredContactMethod = () =>
  random.arrayElement(["phone", "email", "text"]);

export const generateContacts = (db: Db, size = 500): Required<Contact>[] => {
  const nbAvailblePictures = 223;
  let numberOfContacts = 0;

  return Array.from(Array(size).keys()).map((id) => {
    const has_avatar =
      weightedBoolean(25) && numberOfContacts < nbAvailblePictures;
    const gender = random.arrayElement(contactGender).value;
    const first_name = name.firstName(gender as any);
    const last_name = name.lastName();
    const email_jsonb = [
      {
        email: internet.email(first_name, last_name),
        type: getRandomContactDetailsType(),
      },
    ];
    const phone_jsonb = [
      {
        number: phone.phoneNumber(),
        type: getRandomContactDetailsType(),
      },
      {
        number: phone.phoneNumber(),
        type: getRandomContactDetailsType(),
      },
    ];
    const avatar = {
      src: has_avatar
        ? "https://marmelab.com/posters/avatar-" +
          (223 - numberOfContacts) +
          ".jpeg"
        : undefined,
    };
    const title = fakerCompany.bsAdjective();

    if (has_avatar) {
      numberOfContacts++;
    }

    // choose company with people left to know
    let company: Required<Company>;
    do {
      company = random.arrayElement(db.companies);
    } while (company.nb_contacts >= maxContacts[company.size]);
    company.nb_contacts++;

    const first_seen = randomDate(new Date(company.created_at)).toISOString();
    const last_seen = first_seen;

    // Generate a random date of birth (ages 18-80)
    const birthYear =
      new Date().getFullYear() - 18 - Math.floor(Math.random() * 62);
    const birthMonth = Math.floor(Math.random() * 12);
    const birthDay = 1 + Math.floor(Math.random() * 28);
    const date_of_birth = weightedBoolean(60)
      ? new Date(birthYear, birthMonth, birthDay).toISOString().split("T")[0]
      : null;

    return {
      id,
      first_name,
      last_name,
      gender,
      title: title.charAt(0).toUpperCase() + title.substr(1),
      company_id: company.id,
      company_name: company.name,
      email_jsonb,
      phone_jsonb,
      background: lorem.sentence(),
      acquisition: random.arrayElement(["inbound", "outbound"]),
      avatar,
      first_seen: first_seen,
      last_seen: last_seen,
      has_newsletter: weightedBoolean(30),
      preferred_contact_method: getRandomPreferredContactMethod(),
      date_of_birth,
      status: random.arrayElement(defaultNoteStatuses).value,
      tags: random
        .arrayElements(db.tags, random.arrayElement([0, 0, 0, 1, 1, 2]))
        .map((tag) => tag.id), // finalize
      sales_id: company.sales_id,
      nb_tasks: 0,
      linkedin_url: null,
    };
  });
};
