'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Settings,
  Database,
  Activity,
  Users,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  Zap,
  Shield,
  Server,
} from 'lucide-react'

interface DataSource {
  id: string
  name: string
  url: string
  lastSync: string
  syncStatus: string
  errorMessage: string | null
}

interface AIUsage {
  totalCalls: number
  todayCalls: number
  totalTokens: number
  todayTokens: number
  averageResponseTime: number
  successRate: number
}

interface User {
  id: string
  email: string
  name: string
  role: string
  lastLogin: string
  createdAt: string
}

interface SystemStatus {
  apiStatus: string
  databaseStatus: string
  aiServiceStatus: string
  uptime: string
  lastBackup: string
}

export default function AdminPage() {
  const [dataSources, setDataSources] = useState<DataSource[]>([])
  const [aiUsage, setAiUsage] = useState<AIUsage | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState<string | null>(null)

  const fetchAdminData = async () => {
    try {
      const response = await fetch('/api/admin')
      if (response.ok) {
        const data = await response.json()
        setDataSources(data.data.dataSources)
        setAiUsage(data.data.aiUsage)
        setUsers(data.data.users)
        setSystemStatus(data.data.systemStatus)
      }
    } catch (error) {
      console.error('Error fetching admin data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAdminData()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSync = async (sourceId: string) => {
    setSyncing(sourceId)
    try {
      const response = await fetch('/api/admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'sync',
          target: sourceId,
        }),
      })

      if (response.ok) {
        // Update status
        setDataSources((prev) =>
          prev.map((ds) =>
            ds.id === sourceId
              ? { ...ds, syncStatus: 'SYNCING' }
              : ds
          )
        )

        // Simulate sync completion
        setTimeout(() => {
          setDataSources((prev) =>
            prev.map((ds) =>
              ds.id === sourceId
                ? { ...ds, syncStatus: 'SUCCESS', lastSync: new Date().toISOString() }
                : ds
            )
          )
          setSyncing(null)
        }, 2000)
      }
    } catch (error) {
      console.error('Error syncing:', error)
      setSyncing(null)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'ERROR':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'SYNCING':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return <Badge className="bg-green-500">正常</Badge>
      case 'ERROR':
        return <Badge variant="destructive">错误</Badge>
      case 'SYNCING':
        return <Badge className="bg-blue-500">同步中</Badge>
      default:
        return <Badge variant="secondary">空闲</Badge>
    }
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
      <div>
        <h1 className="text-3xl font-bold flex items-center space-x-3">
          <Settings className="h-8 w-8 text-blue-500" />
          <span>管理后台</span>
        </h1>
        <p className="text-muted-foreground mt-2">
          系统管理、数据同步和用户管理
        </p>
      </div>

      {/* System Status */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <Server className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">API状态</p>
                <p className="font-medium text-green-500">
                  {systemStatus?.apiStatus === 'healthy' ? '正常' : '异常'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <Database className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">数据库</p>
                <p className="font-medium text-green-500">
                  {systemStatus?.databaseStatus === 'healthy' ? '正常' : '异常'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <Zap className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">AI服务</p>
                <p className="font-medium text-green-500">
                  {systemStatus?.aiServiceStatus === 'healthy' ? '正常' : '异常'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Shield className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">运行时间</p>
                <p className="font-medium">{systemStatus?.uptime || '99.9%'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="data-sources">
        <TabsList>
          <TabsTrigger value="data-sources">数据源管理</TabsTrigger>
          <TabsTrigger value="ai-usage">AI使用统计</TabsTrigger>
          <TabsTrigger value="users">用户管理</TabsTrigger>
        </TabsList>

        {/* Data Sources */}
        <TabsContent value="data-sources">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Database className="h-5 w-5" />
                <span>数据源状态</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>数据源</TableHead>
                    <TableHead>URL</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>最后同步</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dataSources.map((source) => (
                    <TableRow key={source.id}>
                      <TableCell className="font-medium">{source.name}</TableCell>
                      <TableCell className="text-muted-foreground">{source.url}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(source.syncStatus)}
                          {getStatusBadge(source.syncStatus)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {source.lastSync
                          ? new Date(source.lastSync).toLocaleString('zh-CN')
                          : '-'}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSync(source.id)}
                          disabled={syncing === source.id}
                        >
                          {syncing === source.id ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              同步中...
                            </>
                          ) : (
                            <>
                              <RefreshCw className="mr-2 h-4 w-4" />
                              同步
                            </>
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI Usage */}
        <TabsContent value="ai-usage">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Activity className="h-5 w-5" />
                <span>AI使用统计</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {aiUsage && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-muted-foreground">总调用次数</span>
                        <span className="font-medium">{aiUsage.totalCalls.toLocaleString()}</span>
                      </div>
                      <Progress value={75} className="h-2" />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-muted-foreground">今日调用</span>
                        <span className="font-medium">{aiUsage.todayCalls}</span>
                      </div>
                      <Progress value={45} className="h-2" />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-muted-foreground">总Token数</span>
                        <span className="font-medium">{(aiUsage.totalTokens / 1000000).toFixed(1)}M</span>
                      </div>
                      <Progress value={60} className="h-2" />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-muted-foreground">今日Token</span>
                        <span className="font-medium">{(aiUsage.todayTokens / 1000).toFixed(0)}K</span>
                      </div>
                      <Progress value={30} className="h-2" />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">平均响应时间</p>
                      <p className="text-2xl font-bold">{aiUsage.averageResponseTime}s</p>
                    </div>
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">成功率</p>
                      <p className="text-2xl font-bold text-green-500">{aiUsage.successRate}%</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Users */}
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5" />
                <span>用户管理</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>邮箱</TableHead>
                    <TableHead>姓名</TableHead>
                    <TableHead>角色</TableHead>
                    <TableHead>最后登录</TableHead>
                    <TableHead>注册时间</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.email}</TableCell>
                      <TableCell>{user.name || '-'}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            user.role === 'ADMIN'
                              ? 'destructive'
                              : user.role === 'ANALYST'
                              ? 'default'
                              : 'secondary'
                          }
                        >
                          {user.role === 'ADMIN'
                            ? '管理员'
                            : user.role === 'ANALYST'
                            ? '分析师'
                            : '查看者'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.lastLogin
                          ? new Date(user.lastLogin).toLocaleString('zh-CN')
                          : '-'}
                      </TableCell>
                      <TableCell>
                        {new Date(user.createdAt).toLocaleDateString('zh-CN')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
