'use client'

import { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { useCampaignFolders } from '@/hooks/useCampaignFolders'
import { FolderIcon, FolderOpenIcon, ChevronDownIcon, XIcon, CheckIcon, SettingsIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface CampaignFolderFilterProps {
  selectedFolderId: string | null
  onChange: (folderId: string | null) => void
  onManage?: () => void
  className?: string
}

/**
 * Dropdown para filtrar campanhas por pasta
 * null = todas as campanhas
 * 'none' = sem pasta
 * UUID = pasta específica
 */
export function CampaignFolderFilter({
  selectedFolderId,
  onChange,
  onManage,
  className,
}: CampaignFolderFilterProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const { folders, totalCount, unfiledCount, isLoading } = useCampaignFolders()

  // Fecha ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (folderId: string | null) => {
    onChange(folderId)
    setIsOpen(false)
  }

  const clearFilter = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange(null)
  }

  // Label para o botão
  const getSelectedLabel = () => {
    if (selectedFolderId === null) return null
    if (selectedFolderId === 'none') return 'Sem pasta'
    const folder = folders.find(f => f.id === selectedFolderId)
    return folder?.name || 'Pasta'
  }

  const selectedLabel = getSelectedLabel()
  const hasFilter = selectedFolderId !== null
  const selectedFolder = selectedFolderId && selectedFolderId !== 'none'
    ? folders.find(f => f.id === selectedFolderId)
    : null

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-2 h-9 border-zinc-700 bg-zinc-800/50',
          hasFilter && 'border-primary-500/50'
        )}
      >
        {selectedFolder ? (
          <FolderIcon className="h-4 w-4" style={{ color: selectedFolder.color }} />
        ) : (
          <FolderIcon className="h-4 w-4 text-zinc-400" />
        )}
        <span className={cn('text-sm', hasFilter ? 'text-zinc-200' : 'text-zinc-400')}>
          {selectedLabel || 'Pasta'}
        </span>
        <ChevronDownIcon
          className={cn(
            'h-4 w-4 text-zinc-500 transition-transform',
            isOpen && 'rotate-180'
          )}
        />
        {hasFilter && (
          <button
            onClick={clearFilter}
            className="ml-1 p-0.5 hover:bg-zinc-700 rounded"
            title="Limpar filtro"
          >
            <XIcon className="h-3 w-3 text-zinc-400" />
          </button>
        )}
      </Button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-56 rounded-md border border-zinc-700 bg-zinc-800 shadow-xl z-[200]">
          <div className="p-2 border-b border-zinc-700 flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
              Filtrar por pasta
            </span>
            {onManage && (
              <button
                onClick={() => {
                  onManage()
                  setIsOpen(false)
                }}
                className="p-1 hover:bg-zinc-700 rounded text-zinc-400 hover:text-zinc-200 transition-colors"
                title="Gerenciar pastas"
              >
                <SettingsIcon className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-600 border-t-primary-500" />
            </div>
          ) : folders.length === 0 ? (
            <div className="p-4 text-center text-sm text-zinc-500">
              Nenhuma pasta criada
            </div>
          ) : (
            <div className="max-h-64 overflow-y-auto p-1">
              {/* Todas as campanhas */}
              <button
                onClick={() => handleSelect(null)}
                className={cn(
                  'flex items-center w-full px-3 py-2 rounded text-sm transition-colors gap-2',
                  selectedFolderId === null
                    ? 'bg-primary-500/10 text-primary-400'
                    : 'text-zinc-200 hover:bg-zinc-700/50'
                )}
              >
                <FolderOpenIcon className="h-4 w-4 flex-shrink-0" />
                <span className="flex-1 text-left truncate">Todas</span>
                <span className="text-xs text-zinc-500">({totalCount})</span>
                {selectedFolderId === null && (
                  <CheckIcon className="h-4 w-4 text-primary-400 ml-1" />
                )}
              </button>

              {/* Pastas do usuário */}
              {folders.map((folder) => (
                <button
                  key={folder.id}
                  onClick={() => handleSelect(folder.id)}
                  className={cn(
                    'flex items-center w-full px-3 py-2 rounded text-sm transition-colors gap-2',
                    selectedFolderId === folder.id
                      ? 'bg-primary-500/10 text-primary-400'
                      : 'text-zinc-200 hover:bg-zinc-700/50'
                  )}
                >
                  <FolderIcon
                    className="h-4 w-4 flex-shrink-0"
                    style={{ color: folder.color }}
                  />
                  <span className="flex-1 text-left truncate">{folder.name}</span>
                  <span className="text-xs text-zinc-500">({folder.campaignCount || 0})</span>
                  {selectedFolderId === folder.id && (
                    <CheckIcon className="h-4 w-4 text-primary-400 ml-1" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
