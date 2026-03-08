"use client"

import {
  Building2,
  Mail,
  Users,
  BarChart3,
  FolderOpen,
  Settings,
  Home,
  ChevronDown,
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useGenre } from "./genre-provider"
import { APP_VERSION } from "@/lib/format"

const NAV_ITEMS = [
  { title: "ホーム", href: "/", icon: Home },
  { title: "企業リスト", href: "/companies", icon: Building2 },
  { title: "メール配信", href: "/campaigns", icon: Mail },
  { title: "CRM", href: "/crm", icon: Users },
  { title: "ダッシュボード", href: "/dashboard", icon: BarChart3 },
  { title: "ジャンル管理", href: "/genres", icon: FolderOpen },
  { title: "設定", href: "/settings", icon: Settings },
]

export function AppSidebar() {
  const pathname = usePathname()
  const { genres, currentGenre, setCurrentGenreId } = useGenre()

  return (
    <Sidebar>
      <SidebarHeader className="border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-bold">
            LM
          </div>
          <div>
            <p className="text-sm font-semibold">Lead Manager</p>
            <p className="text-xs text-muted-foreground">顧客管理CRM</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* Genre Selector */}
        <SidebarGroup>
          <div className="px-2 py-2">
            <p className="mb-1.5 px-2 text-xs font-medium text-muted-foreground">
              ジャンル
            </p>
            <Select
              value={currentGenre?.id ?? ""}
              onValueChange={(v) => v && setCurrentGenreId(v)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="ジャンルを選択" />
              </SelectTrigger>
              <SelectContent>
                {genres.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </SidebarGroup>

        {/* Navigation */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map((item) => {
                const isActive =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.href)
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      isActive={isActive}
                      render={<Link href={item.href} />}
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t p-3">
        <p className="text-xs text-muted-foreground text-center">
          Lead Manager v{APP_VERSION}
        </p>
      </SidebarFooter>
    </Sidebar>
  )
}
