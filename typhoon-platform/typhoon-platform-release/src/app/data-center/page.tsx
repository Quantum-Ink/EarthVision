'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { TyphoonData } from '@/types'
import { generateMockTyphoonData } from '@/lib/data'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  getCategoryColor,
  getCategoryName,
  formatWindSpeed,
  formatPressure,
  formatDate,
} from '@/lib/utils'
import {
  Database,
  Search,
  Download,
  Filter,
  RefreshCw,
  Eye,
  Loader2,
} from 'lucide-react'

export default function DataCenterPage() {
  const router = useRouter()
  const [typhoons, setTyphoons] = useState<TyphoonData[]>([])
  const [filteredTyphoons, setFilteredTyphoons] = useState<TyphoonData[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    const mockData = generateMockTyphoonData()
    setTyphoons(mockData)
    setFilteredTyphoons(mockData)
    setLoading(false)
  }, [])

  useEffect(() => {
    let result = typhoons

    // Search filter
    if (searchTerm) {
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (t.nameCn && t.nameCn.includes(searchTerm)) ||
          (t.internationalId && t.internationalId.includes(searchTerm))
      )
    }

    // Category filter
    if (categoryFilter !== 'all') {
      result = result.filter((t) => t.category === categoryFilter)
    }

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter((t) => t.status === statusFilter)
    }

    setFilteredTyphoons(result)
  }, [searchTerm, categoryFilter, statusFilter, typhoons])

  const handleExportCSV = () => {
    const headers = [
      'ID',
      'Name',
      'Name(CN)',
      'International ID',
      'Category',
      'Status',
      'Latitude',
      'Longitude',
      'Max Wind Speed',
      'Min Pressure',
      'Data Source',
      'Start Date',
    ]

    const rows = filteredTyphoons.map((t) => [
      t.id,
      t.name,
      t.nameCn || '',
      t.internationalId || '',
      t.category,
      t.status,
      t.currentLat,
      t.currentLng,
      t.maxWindSpeed,
      t.minPressure,
      t.dataSource,
      t.startDatetime,
    ])

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `typhoons-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-3.5rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    )
  }

  return (
    <div className="container py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center space-x-3">
            <Database className="h-8 w-8 text-blue-500" />
            <span>数据中心</span>
          </h1>
          <p className="text-muted-foreground mt-2">
            查看和分析历史台风数据，支持搜索、筛选和导出
          </p>
        </div>
        <Button onClick={handleExportCSV}>
          <Download className="mr-2 h-4 w-4" />
          导出CSV
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-blue-500">{typhoons.length}</p>
              <p className="text-sm text-muted-foreground">总台风数</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-green-500">
                {typhoons.filter((t) => t.status === 'ACTIVE').length}
              </p>
              <p className="text-sm text-muted-foreground">活跃台风</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-red-500">
                {typhoons.filter((t) => t.category === 'SUPER_TYPHOON').length}
              </p>
              <p className="text-sm text-muted-foreground">超强台风</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-purple-500">
                {new Set(typhoons.map((t) => t.dataSource)).size}
              </p>
              <p className="text-sm text-muted-foreground">数据源</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="搜索台风名称或编号..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="选择强度" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">所有强度</SelectItem>
                <SelectItem value="TROPICAL_DEPRESSION">热带低压</SelectItem>
                <SelectItem value="TROPICAL_STORM">热带风暴</SelectItem>
                <SelectItem value="SEVERE_TROPICAL_STORM">强热带风暴</SelectItem>
                <SelectItem value="TYPHOON">台风</SelectItem>
                <SelectItem value="SEVERE_TYPHOON">强台风</SelectItem>
                <SelectItem value="SUPER_TYPHOON">超强台风</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="选择状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">所有状态</SelectItem>
                <SelectItem value="ACTIVE">活跃</SelectItem>
                <SelectItem value="DISSIPATED">消散</SelectItem>
                <SelectItem value="EXTRATROPICAL">变性</SelectItem>
                <SelectItem value="REMNANT">残余</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>名称</TableHead>
                <TableHead>编号</TableHead>
                <TableHead>强度</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>位置</TableHead>
                <TableHead>最大风速</TableHead>
                <TableHead>最低气压</TableHead>
                <TableHead>数据源</TableHead>
                <TableHead>更新时间</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTyphoons.map((typhoon) => (
                <TableRow key={typhoon.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center space-x-2">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: getCategoryColor(typhoon.category) }}
                      />
                      <span>{typhoon.name}</span>
                      {typhoon.nameCn && (
                        <span className="text-muted-foreground">({typhoon.nameCn})</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{typhoon.internationalId || '-'}</TableCell>
                  <TableCell>
                    <Badge
                      style={{
                        backgroundColor: getCategoryColor(typhoon.category),
                        color: 'white',
                      }}
                    >
                      {getCategoryName(typhoon.category)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        typhoon.status === 'ACTIVE'
                          ? 'default'
                          : typhoon.status === 'DISSIPATED'
                          ? 'secondary'
                          : 'outline'
                      }
                    >
                      {typhoon.status === 'ACTIVE'
                        ? '活跃'
                        : typhoon.status === 'DISSIPATED'
                        ? '消散'
                        : typhoon.status === 'EXTRATROPICAL'
                        ? '变性'
                        : '残余'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {typhoon.currentLat.toFixed(1)}°N, {typhoon.currentLng.toFixed(1)}°E
                  </TableCell>
                  <TableCell>{formatWindSpeed(typhoon.maxWindSpeed)}</TableCell>
                  <TableCell>{formatPressure(typhoon.minPressure)}</TableCell>
                  <TableCell>{typhoon.dataSource}</TableCell>
                  <TableCell>{formatDate(typhoon.lastUpdated)}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => router.push(`/typhoon/${typhoon.id}`)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
