import { useState } from "react";
import {
  useGetIdentity,
  useGetList,
  useCreate,
  useNotify,
  useRefresh,
  useRecordContext,
} from "ra-core";
import { useForm, type SubmitHandler } from "react-hook-form";
import { CreditCard, Plus, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

import type { Deal, Payment } from "../types";

type PaymentFormData = {
  amount: string;
  payment_method: string;
  notes: string;
};

const paymentMethodLabels: Record<string, string> = {
  cash: "Cash",
  eftpos: "EFTPOS",
  "bank-transfer": "Bank Transfer",
  "credit-card": "Credit Card",
  "Direct Debit": "Direct Debit",
  dd: "Direct Debit",
};

export const PaymentList = () => {
  const record = useRecordContext<Deal>();
  const [showForm, setShowForm] = useState(false);

  const { data: payments, isPending } = useGetList<Payment>("payments", {
    pagination: { page: 1, perPage: 100 },
    sort: { field: "payment_date", order: "DESC" },
    filter: { deal_id: record?.id },
  });

  if (!record) return null;

  const remaining = record.amount - (record.total_paid ?? 0);
  const isLegacy = record.source === "legacy";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Receipt className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground tracking-wide font-medium">
            Payments
          </span>
        </div>
        {remaining > 0 && !showForm && !isLegacy && (
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            onClick={() => setShowForm(true)}
          >
            <Plus className="w-3 h-3 mr-1" />
            Record Payment
          </Button>
        )}
      </div>

      {showForm && (
        <RecordPaymentForm
          dealId={record.id}
          remaining={remaining}
          onClose={() => setShowForm(false)}
        />
      )}

      {isPending ? null : payments && payments.length > 0 ? (
        <div className="space-y-1">
          {payments.map((payment) => (
            <PaymentRow key={payment.id} payment={payment} />
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground py-2">
          No payments recorded yet.
        </p>
      )}
    </div>
  );
};

const PaymentRow = ({ payment }: { payment: Payment }) => {
  return (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <CreditCard className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        <span className="text-muted-foreground text-xs">
          {new Date(payment.payment_date + "T00:00:00").toLocaleDateString(
            "en-NZ",
            {
              day: "numeric",
              month: "short",
              year: "numeric",
            },
          )}
        </span>
        <Badge variant="outline" className="text-xs px-1.5 py-0 h-5">
          {paymentMethodLabels[payment.payment_method] ??
            payment.payment_method}
        </Badge>
        {payment.notes && (
          <span className="text-xs text-muted-foreground truncate">
            {payment.notes}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="font-medium text-sm text-green-700 dark:text-green-400">
          +
          {payment.amount.toLocaleString("en-NZ", {
            style: "currency",
            currency: "NZD",
            minimumFractionDigits: 2,
          })}
        </span>
        {payment.receipt_number && (
          <span className="text-xs text-muted-foreground">
            #{payment.receipt_number}
          </span>
        )}
      </div>
    </div>
  );
};

const RecordPaymentForm = ({
  dealId,
  remaining,
  onClose,
}: {
  dealId: Deal["id"];
  remaining: number;
  onClose: () => void;
}) => {
  const notify = useNotify();
  const refresh = useRefresh();
  const { identity } = useGetIdentity();
  const [create, { isPending }] = useCreate();
  const [paymentMethod, setPaymentMethod] = useState("eftpos");

  const {
    register,
    handleSubmit,
    formState: { isValid },
  } = useForm<PaymentFormData>({
    mode: "onChange",
    defaultValues: {
      amount: String(remaining > 0 ? Math.min(remaining, remaining) : ""),
      payment_method: "eftpos",
      notes: "",
    },
  });

  const onSubmit: SubmitHandler<PaymentFormData> = (data) => {
    const amount = Math.round(parseFloat(data.amount) * 100) / 100;
    create(
      "payments",
      {
        data: {
          deal_id: dealId,
          amount,
          payment_date: new Date().toISOString().split("T")[0],
          payment_method: paymentMethod,
          notes: data.notes || undefined,
          sales_id: identity?.id,
        },
      },
      {
        onSuccess: () => {
          notify("Payment recorded");
          refresh();
          onClose();
        },
        onError: () => {
          notify("Failed to record payment", { type: "error" });
        },
      },
    );
  };

  return (
    <div className="border rounded-lg p-3 bg-muted/30">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <Label htmlFor="amount" className="text-xs">
              Amount (NZD)
            </Label>
            <Input
              {...register("amount", {
                required: true,
                min: 0.01,
                validate: (v) => parseFloat(v) > 0,
              })}
              id="amount"
              type="number"
              step="0.01"
              min="0.01"
              max={remaining}
              className="h-8 text-sm"
            />
            <span className="text-xs text-muted-foreground">
              Remaining:{" "}
              {remaining.toLocaleString("en-NZ", {
                style: "currency",
                currency: "NZD",
              })}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="payment_method" className="text-xs">
              Method
            </Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="eftpos">EFTPOS</SelectItem>
                <SelectItem value="bank-transfer">Bank Transfer</SelectItem>
                <SelectItem value="credit-card">Credit Card</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="notes" className="text-xs">
            Notes (optional)
          </Label>
          <Input
            {...register("notes")}
            id="notes"
            className="h-8 text-sm"
            placeholder="e.g. Deposit, Weekly payment"
          />
        </div>
        <Separator />
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-7"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={!isValid || isPending}
            className="h-7"
          >
            Record Payment
          </Button>
        </div>
      </form>
    </div>
  );
};
