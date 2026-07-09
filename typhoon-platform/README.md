# EarthVision

AI台风预测分析平台 - 基于人工智能的台风路径预测与风险分析

## 功能

- 🌊 实时台风监测 - 全球台风实时位置、风圈、路径可视化
- 🤖 AI智能分析 - 路径预测、登陆概率、风险评估
- 📊 数据融合 - 多源数据融合（JTWC/CMA/JMA/ECMWF/NOAA）
- 🎲 概率模拟 - Monte Carlo模拟、概率锥计算
- 📤 专业导出 - SVG/PNG/PDF预报图导出
- 📈 历史数据 - 台风历史查询、统计分析

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 访问 http://localhost:3000
```

## 技术栈

- Next.js 15 + React 19 + TypeScript
- TailwindCSS + shadcn/ui
- Mapbox GL JS + ECharts + Recharts
- Prisma + PostgreSQL
- Python ML Server (FastAPI)

## 页面

| 路径 | 功能 |
|------|------|
| `/` | 首页 - 台风监控中心 |
| `/analysis` | AI智能分析 |
| `/data-center` | 数据中心 |
| `/admin` | 管理后台 |
| `/typhoon/[id]` | 台风详情 |
| `/forecast/[id]` | 预测分析 |

## API

```
GET  /api/typhoons          # 台风列表
GET  /api/typhoons/:id      # 台风详情
POST /api/ai/analyze        # AI分析
POST /api/fusion            # 数据融合
POST /api/probability       # 概率模拟
POST /api/export            # 导出预报图
GET  /api/history           # 历史数据
GET  /api/models            # ML模型
```

## 环境变量

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/earthvision"
NEXTAUTH_SECRET="your-secret-key"
MIMO_API_KEY="your-mimo-api-key"
NEXT_PUBLIC_MAPBOX_TOKEN="your-mapbox-token"
```

## Docker

```bash
docker-compose up -d
```

## License

MIT
