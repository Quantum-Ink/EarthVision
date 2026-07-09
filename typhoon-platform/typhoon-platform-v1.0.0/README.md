# AI台风预测分析平台

基于人工智能的台风路径预测与风险分析平台，提供实时台风监测和智能预警服务。

## 功能特性

### 🏠 首页
- 当前活跃台风实时监测
- 世界地图展示台风位置
- 台风风圈、路径、强度可视化
- 实时风速和气压数据

### 🌀 台风详情
- 台风基础信息展示
- 历史路径回放
- 未来路径AI预测
- 影响范围评估
- 风险等级分析

### 🤖 AI智能分析
- 基于MIMO API的智能分析
- 路径预测与登陆概率计算
- 城市影响评估
- 防灾建议生成
- 多维度风险分析

### 📊 数据中心
- 历史台风数据查询
- 多条件搜索和筛选
- 数据导出CSV
- 统计图表展示

### ⚙️ 管理后台
- 数据源状态监控
- API调用统计
- 用户权限管理
- 系统状态监控

## 技术栈

### 前端
- **Next.js 15** - React框架
- **React 19** - UI库
- **TypeScript** - 类型安全
- **TailwindCSS** - 样式框架
- **shadcn/ui** - 组件库
- **ECharts** - 图表库
- **Mapbox GL JS** - 地图可视化
- **Recharts** - React图表

### 后端
- **Next.js API Routes** - API服务
- **Node.js** - 运行时
- **Prisma** - ORM
- **PostgreSQL** - 数据库

### AI
- **MIMO API** - 大语言模型
- 路径预测
- 风险评估
- 灾害等级评估
- 防灾建议生成

### 数据来源
- **JTWC** - 联合台风警报中心
- **NOAA** - 美国国家海洋和大气管理局
- **CMA** - 中国气象局
- **JMA** - 日本气象厅
- **ECMWF** - 欧洲中期天气预报中心

## 快速开始

### 环境要求
- Node.js 18+
- PostgreSQL 14+
- npm 或 yarn

### 安装步骤

1. **克隆项目**
```bash
git clone https://github.com/your-username/typhoon-platform.git
cd typhoon-platform
```

2. **安装依赖**
```bash
npm install
```

3. **配置环境变量**
```bash
cp .env.example .env
# 编辑 .env 文件，配置数据库连接和API密钥
```

4. **初始化数据库**
```bash
npx prisma generate
npx prisma db push
npx prisma db seed
```

5. **启动开发服务器**
```bash
npm run dev
```

6. **访问应用**
打开浏览器访问 http://localhost:3000

### Docker部署

1. **构建镜像**
```bash
docker-compose build
```

2. **启动服务**
```bash
docker-compose up -d
```

3. **查看日志**
```bash
docker-compose logs -f
```

## 项目结构

```
typhoon-platform/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API路由
│   │   ├── typhoon/           # 台风详情页
│   │   ├── analysis/          # AI分析页
│   │   ├── data-center/       # 数据中心页
│   │   ├── admin/             # 管理后台页
│   │   ├── layout.tsx         # 根布局
│   │   ├── page.tsx           # 首页
│   │   └── globals.css        # 全局样式
│   ├── components/            # 组件
│   │   ├── ui/               # UI组件
│   │   ├── map/              # 地图组件
│   │   ├── charts/           # 图表组件
│   │   ├── layout/           # 布局组件
│   │   ├── typhoon/          # 台风组件
│   │   └── ai/               # AI组件
│   ├── lib/                   # 工具库
│   │   ├── db.ts             # 数据库连接
│   │   ├── ai.ts             # AI服务
│   │   ├── data.ts           # 数据服务
│   │   └── utils.ts          # 工具函数
│   ├── hooks/                 # 自定义Hooks
│   └── types/                 # TypeScript类型
├── prisma/                    # Prisma配置
│   ├── schema.prisma         # 数据库模型
│   └── seed.ts               # 种子数据
├── public/                    # 静态资源
├── Dockerfile                 # Docker配置
├── docker-compose.yml        # Docker Compose
└── package.json               # 项目配置
```

## API接口

### 台风数据
- `GET /api/typhoons` - 获取台风列表
- `GET /api/typhoons/:id` - 获取台风详情
- `POST /api/typhoons` - 创建台风
- `PUT /api/typhoons/:id` - 更新台风
- `DELETE /api/typhoons/:id` - 删除台风

### AI分析
- `POST /api/ai/analyze` - AI分析台风

### 数据中心
- `GET /api/data` - 获取数据（支持CSV导出）

### 管理后台
- `GET /api/admin` - 获取管理数据
- `POST /api/admin` - 执行管理操作

## 环境变量

```env
# 数据库
DATABASE_URL="postgresql://user:password@localhost:5432/typhoon_platform"

# NextAuth
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"

# MIMO API
MIMO_API_KEY="your-mimo-api-key"
MIMO_API_URL="https://api.mimo.com/v1"

# Mapbox
NEXT_PUBLIC_MAPBOX_TOKEN="your-mapbox-token"
```

## 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

## 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

## 联系方式

- 项目链接: https://github.com/your-username/typhoon-platform
- 问题反馈: https://github.com/your-username/typhoon-platform/issues

## 致谢

- [Next.js](https://nextjs.org/)
- [React](https://reactjs.org/)
- [TailwindCSS](https://tailwindcss.com/)
- [shadcn/ui](https://ui.shadcn.com/)
- [ECharts](https://echarts.apache.org/)
- [Mapbox](https://www.mapbox.com/)
- [Prisma](https://www.prisma.io/)
- [MIMO API](https://mimo.com/)
