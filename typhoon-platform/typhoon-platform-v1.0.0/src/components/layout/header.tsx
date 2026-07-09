'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  Cloud,
  LayoutDashboard,
  Database,
  Settings,
  Activity,
  BarChart3,
  AlertTriangle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const navItems = [
  {
    title: '首页',
    href: '/',
    icon: LayoutDashboard,
  },
  {
    title: 'AI分析',
    href: '/analysis',
    icon: Activity,
  },
  {
    title: '数据中心',
    href: '/data-center',
    icon: Database,
  },
  {
    title: '管理后台',
    href: '/admin',
    icon: Settings,
  },
]

export function Header() {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="mr-4 hidden md:flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <Cloud className="h-6 w-6 text-blue-500" />
            <span className="hidden font-bold sm:inline-block">
              AI台风预测平台
            </span>
          </Link>
          <nav className="flex items-center space-x-6 text-sm font-medium">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'transition-colors hover:text-foreground/80',
                  pathname === item.href
                    ? 'text-foreground'
                    : 'text-foreground/60'
                )}
              >
                <div className="flex items-center space-x-2">
                  <item.icon className="h-4 w-4" />
                  <span>{item.title}</span>
                </div>
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          <div className="w-full flex-1 md:w-auto md:flex-none">
            <div className="hidden md:flex items-center space-x-2">
              <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                <span>3个活跃台风</span>
              </div>
            </div>
          </div>

          <nav className="flex items-center space-x-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <BarChart3 className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>数据源状态</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <div className="flex items-center space-x-2">
                    <div className="h-2 w-2 rounded-full bg-green-500" />
                    <span>JTWC - 正常</span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <div className="flex items-center space-x-2">
                    <div className="h-2 w-2 rounded-full bg-green-500" />
                    <span>NOAA - 正常</span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <div className="flex items-center space-x-2">
                    <div className="h-2 w-2 rounded-full bg-yellow-500" />
                    <span>CMA - 同步中</span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <div className="flex items-center space-x-2">
                    <div className="h-2 w-2 rounded-full bg-green-500" />
                    <span>JMA - 正常</span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <div className="flex items-center space-x-2">
                    <div className="h-2 w-2 rounded-full bg-green-500" />
                    <span>ECMWF - 正常</span>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>
        </div>
      </div>
    </header>
  )
}
