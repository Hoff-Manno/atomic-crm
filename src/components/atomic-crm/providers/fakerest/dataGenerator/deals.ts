import { add } from "date-fns";
import { datatype, lorem, random, commerce } from "faker/locale/en_US";

import {
  defaultDealCategories,
  defaultDealStages,
} from "../../../root/defaultConfiguration";
import type { Deal } from "../../../types";
import type { Db } from "./types";
import { randomDate } from "./utils";

const paymentFrequencies = ["weekly", "fortnightly", "monthly"];
const locations = [
  "Main warehouse",
  "Store room A",
  "Store room B",
  "Back office",
  "Display floor",
  null,
];

export const generateDeals = (db: Db): Deal[] => {
  const deals = Array.from(Array(50).keys()).map((id) => {
    const company = random.arrayElement(db.companies);
    company.nb_deals++;
    const contacts = random.arrayElements(
      db.contacts.filter((contact) => contact.company_id === company.id),
      datatype.number({ min: 1, max: 3 }),
    );
    const lowercaseName = lorem.words();
    const created_at = randomDate(new Date(company.created_at)).toISOString();

    const expected_closing_date = randomDate(
      new Date(created_at),
      add(new Date(created_at), { months: 6 }),
    )
      .toISOString()
      .split("T")[0];

    const amount = datatype.number(1000) * 100;
    const deposit_amount = Math.round(amount * 0.1); // 10% deposit
    const stage = random.arrayElement(defaultDealStages).value;

    // Calculate total_paid based on stage
    let total_paid = 0;
    if (stage === "deposit-paid") {
      total_paid = deposit_amount;
    } else if (stage === "in-progress") {
      total_paid =
        deposit_amount +
        datatype.number({ min: 1, max: Math.max(1, amount - deposit_amount) });
    } else if (
      stage === "paid-in-full" ||
      stage === "collected"
    ) {
      total_paid = amount;
    }

    const payment_frequency = random.arrayElement(paymentFrequencies);

    // next_payment_date only for active contracts
    const next_payment_date =
      stage === "in-progress" || stage === "deposit-paid"
        ? add(new Date(), {
            days: datatype.number({ min: 1, max: 14 }),
          })
            .toISOString()
            .split("T")[0]
        : null;

    const contract_end_date =
      stage !== "collected" && stage !== "cancelled" && stage !== "defaulted"
        ? add(new Date(expected_closing_date), { days: 14 })
            .toISOString()
            .split("T")[0]
        : null;

    return {
      id,
      name: lowercaseName[0].toUpperCase() + lowercaseName.slice(1),
      company_id: company.id,
      contact_ids: contacts.map((contact) => contact.id),
      category: random.arrayElement(defaultDealCategories).value,
      stage,
      description: lorem.paragraphs(datatype.number({ min: 1, max: 4 })),
      amount,
      created_at,
      updated_at: randomDate(new Date(created_at)).toISOString(),
      expected_closing_date,
      sales_id: company.sales_id,
      index: 0,
      item_description: commerce.productName(),
      deposit_amount,
      payment_frequency,
      next_payment_date,
      total_paid,
      contract_end_date,
      item_held_location: random.arrayElement(locations),
      source: "new" as const,
    };
  });

  // Add a few simulated legacy deals for demo mode
  const legacyNames = [
    "Smith, John",
    "Williams, Sarah",
    "Brown, Michael",
    "Taylor, Emma",
    "Wilson, David",
  ];
  const legacyItems = [
    "Samsung 65\" TV",
    "iPhone 15 Pro Max",
    "Dyson V15 Vacuum",
    "LG Washing Machine",
    "Nintendo Switch OLED",
  ];
  legacyNames.forEach((name, i) => {
    const legacyId = 1000000 + i;
    const amount = datatype.number({ min: 500, max: 3000 });
    const totalPaid = datatype.number({ min: 0, max: amount });
    const stage =
      totalPaid >= amount
        ? "paid-in-full"
        : totalPaid > 0
          ? "in-progress"
          : "new";
    deals.push({
      id: legacyId,
      name,
      company_id: null as any,
      contact_ids: [],
      category: "",
      stage,
      description: "",
      amount,
      created_at: new Date(2024, 0, 1 + i * 30).toISOString(),
      updated_at: new Date(2024, 0, 1 + i * 30).toISOString(),
      expected_closing_date: new Date(2025, 6, 1 + i * 14)
        .toISOString()
        .split("T")[0],
      sales_id: null as any,
      index: 0,
      item_description: legacyItems[i],
      deposit_amount: Math.round(amount * 0.1),
      payment_frequency: i % 2 === 0 ? "weekly" : "fortnightly",
      next_payment_date: null,
      total_paid: totalPaid,
      contract_end_date: null,
      item_held_location: null,
      source: "legacy" as const,
      legacy_id: `LP-${1000 + i}`,
    });
  });

  // compute index based on stage
  defaultDealStages.forEach((stage) => {
    deals
      .filter(
        (deal) => deal.stage === stage.value && deal.source !== "legacy",
      )
      .forEach((deal, index) => {
        const idx = deals.findIndex((d) => d.id === deal.id);
        if (idx >= 0) deals[idx].index = index;
      });
  });
  return deals;
};
