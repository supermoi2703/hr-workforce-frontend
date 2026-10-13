"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { getErrorMessage } from "@/lib/api/errors";
import { applyServerFieldErrors } from "@/lib/forms";
import { createDemoEmployee } from "./demo-api";

// Kiểm tra phía client để báo lỗi sớm; backend vẫn kiểm tra lại và có thể trả lỗi theo từng ô.
const schema = z.object({
  fullName: z.string().trim().min(2, "Họ tên tối thiểu 2 ký tự"),
  email: z.email("Email không hợp lệ"),
});

type FormValues = z.infer<typeof schema>;

export function FormDemo() {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { fullName: "", email: "" },
  });

  const mutation = useMutation({
    mutationFn: createDemoEmployee,
    onSuccess: () => {
      toast.success("Đã lưu nhân viên");
      form.reset();
    },
    onError: (error) => {
      // Lỗi theo từng ô (ApiResponse.errors) gắn vào form; lỗi khác báo bằng toast.
      if (!applyServerFieldErrors(error, form.setError)) toast.error(getErrorMessage(error));
    },
  });

  const { errors } = form.formState;

  return (
    <form onSubmit={form.handleSubmit((values) => mutation.mutate(values))} className="max-w-md" noValidate>
      <FieldGroup>
        <Field data-invalid={!!errors.fullName}>
          <FieldLabel htmlFor="demo-fullName">Họ tên</FieldLabel>
          <Input id="demo-fullName" aria-invalid={!!errors.fullName} {...form.register("fullName")} />
          <FieldError errors={[errors.fullName]} />
        </Field>
        <Field data-invalid={!!errors.email}>
          <FieldLabel htmlFor="demo-email">Email</FieldLabel>
          <Input id="demo-email" type="email" aria-invalid={!!errors.email} {...form.register("email")} />
          <FieldDescription>Nhập email đuôi @taken.com để thử lỗi trả về từ backend.</FieldDescription>
          <FieldError errors={[errors.email]} />
        </Field>
        <div>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending && <Spinner />} Lưu
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}
