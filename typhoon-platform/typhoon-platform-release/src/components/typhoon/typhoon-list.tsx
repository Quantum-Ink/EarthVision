'use client'

import React from 'react'
import { TyphoonData } from '@/types'
import { TyphoonCard } from './typhoon-card'
import { ScrollArea } from '@/components/ui/scroll-area'

interface TyphoonListProps {
  typhoons: TyphoonData[]
  className?: string
}

export function TyphoonList({ typhoons, className = '' }: TyphoonListProps) {
  if (typhoons.length === 0) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <p className="text-muted-foreground">暂无活跃台风</p>
      </div>
    )
  }

  return (
    <ScrollArea className={className}>
      <div className="space-y-4 p-4">
        {typhoons.map((typhoon) => (
          <TyphoonCard key={typhoon.id} typhoon={typhoon} />
        ))}
      </div>
    </ScrollArea>
  )
}
