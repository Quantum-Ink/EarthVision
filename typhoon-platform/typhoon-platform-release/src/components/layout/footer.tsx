import React from 'react'
import { Cloud, GitBranch, MessageCircle, Mail } from 'lucide-react'
import { Separator } from '@/components/ui/separator'

export function Footer() {
  return (
    <footer className="border-t bg-background">
      <div className="container py-8 md:py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center space-x-2 mb-4">
              <Cloud className="h-6 w-6 text-blue-500" />
              <span className="font-bold">AI台风预测平台</span>
            </div>
            <p className="text-sm text-muted-foreground">
              基于人工智能的台风路径预测与风险分析平台，提供实时台风监测和智能预警服务。
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-3">数据来源</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>JTWC - 联合台风警报中心</li>
              <li>NOAA - 美国国家海洋和大气管理局</li>
              <li>CMA - 中国气象局</li>
              <li>JMA - 日本气象厅</li>
              <li>ECMWF - 欧洲中期天气预报中心</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-3">功能</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>实时台风监测</li>
              <li>AI路径预测</li>
              <li>风险评估</li>
              <li>灾害预警</li>
              <li>数据分析</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-3">联系我们</h3>
            <div className="flex space-x-4">
              <a href="#" className="text-muted-foreground hover:text-foreground">
                <GitBranch className="h-5 w-5" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-foreground">
                <MessageCircle className="h-5 w-5" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-foreground">
                <Mail className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>

        <Separator className="my-8" />

        <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          <p className="text-sm text-muted-foreground">
            © 2024 AI台风预测平台. All rights reserved.
          </p>
          <div className="flex space-x-6 text-sm text-muted-foreground">
            <a href="#" className="hover:text-foreground">隐私政策</a>
            <a href="#" className="hover:text-foreground">服务条款</a>
            <a href="#" className="hover:text-foreground">API文档</a>
          </div>
        </div>
      </div>
    </footer>
  )
}
