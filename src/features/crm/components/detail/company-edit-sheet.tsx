"use client"

import { useState } from "react"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Pencil } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet"
import type { Company } from "@/types/database"

const companyEditSchema = z.object({
  name: z.string().min(1, "会社名は必須です"),
  email: z.string().email("有効なメールアドレスを入力").or(z.literal("")).nullable(),
  phone: z.string().nullable(),
  address: z.string().nullable(),
  prefecture: z.string().nullable(),
  website: z.string().url("有効なURLを入力").or(z.literal("")).nullable(),
  memo: z.string().nullable(),
})

type CompanyEditFormData = z.infer<typeof companyEditSchema>

type Props = {
  company: Company
  onUpdate: (updated: Company) => void
}

export function CompanyEditSheet({ company, onUpdate }: Props) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const form = useForm<CompanyEditFormData>({
    resolver: zodResolver(companyEditSchema),
    defaultValues: {
      name: company.name,
      email: company.email || "",
      phone: company.phone || "",
      address: company.address || "",
      prefecture: company.prefecture || "",
      website: company.website || "",
      memo: company.memo || "",
    },
  })

  const onSubmit = async (data: CompanyEditFormData) => {
    setSaving(true)
    const supabase = createClient()

    // nullify empty strings
    const cleanData = {
      name: data.name,
      email: data.email || null,
      phone: data.phone || null,
      address: data.address || null,
      prefecture: data.prefecture || null,
      website: data.website || null,
      memo: data.memo || null,
      updated_at: new Date().toISOString(),
    }

    const { error } = await supabase
      .from("lm_companies")
      .update(cleanData)
      .eq("id", company.id)

    setSaving(false)
    if (error) {
      toast.error("保存に失敗しました")
      return
    }

    toast.success("企業情報を更新しました")
    onUpdate({ ...company, ...cleanData })
    setOpen(false)
  }

  // Reset form when company changes or sheet opens
  // base-ui onOpenChange signature: (open: boolean, eventDetails) => void
  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen)
    if (isOpen) {
      form.reset({
        name: company.name,
        email: company.email || "",
        phone: company.phone || "",
        address: company.address || "",
        prefecture: company.prefecture || "",
        website: company.website || "",
        memo: company.memo || "",
      })
    }
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger render={<Button variant="outline" size="sm" />}>
        <Pencil className="mr-1.5 h-3.5 w-3.5" />
        編集
      </SheetTrigger>
      <SheetContent className="sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>企業情報の編集</SheetTitle>
        </SheetHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 px-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">会社名 *</Label>
            <Input id="edit-name" {...form.register("name")} />
            {form.formState.errors.name && (
              <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-email">メールアドレス</Label>
            <Input id="edit-email" type="email" {...form.register("email")} />
            {form.formState.errors.email && (
              <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-phone">電話番号</Label>
            <Input id="edit-phone" {...form.register("phone")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-address">住所</Label>
            <Input id="edit-address" {...form.register("address")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-prefecture">都道府県</Label>
            <Input id="edit-prefecture" {...form.register("prefecture")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-website">ウェブサイト</Label>
            <Input id="edit-website" {...form.register("website")} />
            {form.formState.errors.website && (
              <p className="text-xs text-destructive">{form.formState.errors.website.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-memo">メモ</Label>
            <Textarea id="edit-memo" {...form.register("memo")} rows={4} />
          </div>
          <SheetFooter className="gap-2 sm:gap-0">
            <SheetClose render={<Button type="button" variant="outline" />}>
              キャンセル
            </SheetClose>
            <Button type="submit" disabled={saving}>
              {saving ? "保存中..." : "保存"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
