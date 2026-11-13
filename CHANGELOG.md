# Changelog

Todas as mudanças notáveis deste projeto serão documentadas neste arquivo.
O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e este projeto adere ao [Versionamento Semântico](https://semver.org/lang/pt-BR/).

---

## [Não lançado]

### 🚀 Adicionado
- Melhorias contínuas em homologação.

---

## [0.5.0] - 2026-11-13 — Milestone M14: Modularização Arquitetural da UI, Padronização & Refino

### 🔄 Modificado
- **Fatiamento Arquitetural do Shell Principal (`App.vue` 2160 → 201 linhas)** (#72, #73, #74):
  - Extraídos componentes de layout coesos: `MindTopbar`, `MindSidebar`, `MindRightDrawer`, `MindPageWorkspace` e `MindBulkImportModal`.
  - Extraídos composables `useSidebarResizer` e `usePageFrontmatter`, além de utilitário de mídia `utils/media.ts`.
  - Painéis laterais direitos (`Comentários` e `IA`) passam a iniciar fechados por padrão (`isCommentsDrawerOpen = false`) (#73).
- **Padronização de Modais e Popovers (`MindModal` & `MindPopover`)** (#75, #76):
  - Eliminado 100% do uso direto de `<q-dialog>` em `apps/web` com migração de `MindSearchModal`, `MindTrashModal` e `MindVersionHistoryModal` para `<MindModal>` (suporte a `hideHeader`, `flush` e slot `#header-actions`).
  - Criado `<MindPopover>` + `useDismissiblePopover` unificando `MindWorkspaceMenu`, `MindHelpVersionsMenu`, `MindSidebarAppsMenu` e `MindActionMenu`.
- **Decomposição de Blocos Pesados da Web UI** (#77):
  - `DiagramEmbedsBlock` fatiado em `MermaidEmbedPanel`, `ExcalidrawEmbedPanel` e `DrawioEmbedPanel` com `<KeepAlive>`.
  - `DatabaseViewBlock` fatiado em `database-helpers.ts`, `DatabaseTableView` e `DatabaseKanbanBoard`.
  - `MindSettingsModal` fatiado em 5 abas independentes (`SettingsGeneralTab`, `SettingsAppearanceTab`, `SettingsSyncTab`, `SettingsShortcutsTab`, `SettingsStorageTab`) e CSS compartilhado.
- **Refino Modular do `@mind-hub/editor`** (#78, #79, #80):
  - `FrontmatterHeader` decomposto em `frontmatter/frontmatter-helpers.ts`, `RawYamlEditor`, `PropertyContextMenu` e `PropertyRow`.
  - `BlockGutter` decomposto em `gutter/gutter-helpers.ts`, `gutter-menu.css`, `BlockColorSubmenu` e `BlockActionsMenu`.
  - `MindEditor` enxugado via `useEditorFrontmatter`, `useBlockGutterCoordinator` e folha `mind-editor-canvas.css`.

### 🧪 Testes & Auditoria
- Adicionada cobertura unitária dedicada para `useEditorFrontmatter`, `useBlockGutterCoordinator`, `MindModal`, `MindPopover` e navegação em abas do `MindSettingsModal` (#81).
- Código auditado via NVIDIA NIM (`poolside/laguna-xs-2.1`) garantindo limpeza de event listeners, estados reativos seguros e conformidade estrita com `mind-light-style` (#81).

---

## [0.4.0] - 2026-11-13 — Milestone M10: Mind Editor (@mind-hub/editor Beta)

### 🚀 Adicionado
- **Pacote Desacoplado `@mind-hub/editor`**: motor autoral Notion-like construindo sobre Tiptap v2 + ProseMirror sob `mind-light-style` (#49, #57).
- **Gutter Autoral (`BlockGutter`) & Seleção por Bloco (`BlockSelection` + `useMarqueeSelection`)**:
  - Alça lateral `+` e grip `⠿` centralizados na altura do bloco, ocultados automaticamente ao digitar e reativados por hover (#50).
  - Menu contextual esquerdo Notion-like com busca de ações, transformação (`Transformar em`), duplicação, exclusão e seletor duplo de cores (Cor do texto + Fundo do bloco com cores recentes e paleta hex) (#50).
  - Caixa de seleção em laço (marquee drag externo) separada da seleção interna de texto, com exclusão, movimentação e duplicação em grupo.
- **Propriedades YAML Estilo Obsidian (`FrontmatterHeader`)**:
  - Oculto por padrão em notas em branco e ativável via botão `+ Propriedades`, menu `Propriedades (YAML)` ou digitando `---` (#49, #56).
  - Suporte a tipos de propriedade (`Texto`, `Lista`, `Número`, `Data`, `Data & hora`, `Caixa de seleção`), adição rápida de tags padrão/livres e alternância `YAML puro` apenas quando expandido.
- **Slash Menu (`/`), Menções (`@` e `[[...]]`) & Bubble Formatting Inline**:
  - Catálogo extensível de blocos com busca fuzzy, atalhos e navegação por teclado (#51, #55).
  - Menções interativas de páginas (`PageMention`) e atalhos Markdown via `InputRules` (`- `, `1. `, `[]`, `---`, headings, etc.) (#52, #55).
- **Blocos Ricos Nativos (`CalloutNode` & `MermaidNode`)**:
  - Admonitions / frases de destaque pastel estilizadas com seletor de emoji / ícones Lucide (`MindIconPicker`) (#54).
  - Diagramas Mermaid com renderização SVG nativa e editor de código inline (#53).
- **Integração Beta no `apps/web`**:
  - Substituição integral do editor legado por `<MindEditor>` com slot `#title` abaixo das propriedades YAML, preservando DB `Page.title` como identidade da nota e suíte completa de testes unitários e conformidade (#56, #57).

### 🐛 Corrigido
- Adicionado `packages/editor/package.json` ao estágio de build do `Dockerfile` para compatibilidade completa com `pnpm install --frozen-lockfile` no GHCR.
- Normalizado padding entre `.editor-container` e `.mind-hub-editor-shell` mantendo alinhamento vertical entre ícone, título H1 e blocos sem clipping da alça lateral (`BlockGutter`).

---

## [0.3.0] - 2026-11-12 — Milestone M13: Shell, Gestão de Arquivos & Design System Global

### 🚀 Adicionado
- Primitivos UI desacoplados `MindModal`, `MindConfirmDialog` e `MindDropdown` sob `mind-light-style`, com suporte a submenus flutuantes, atalhos de teclado e posicionamento adaptativo (#59, #60).
- Menu contextual da árvore de páginas (`MindTreeContextMenu`) no estilo Notion, com suporte a botão direito e botão `...` (#61).
- Modal visual para mover páginas entre pastas (`MindMovePageModal`) com prevenção anti-loop hierárquico (#62).
- Seção retrátil de `Favoritos` com controles de expandir/recolher tudo e componente atômico `MindFavoriteItem` com ações de hover (`+` nova subpágina e `...` menu contextual) (#63, #71).
- Painel global de configurações em abas (`MindSettingsModal`) com Sincronização do Vault, Atalhos de Teclado e Gestão de Armazenamento, além de modal de captura rápida desacoplado (#65, #66, #67).
- Operações profundas no store para duplicação recursiva de subárvore e renomeação inline (#64).
- Suíte de testes unitários Vitest para gestão de arquivos e shell global (`shell-and-file-management.test.ts`) (#68).

### 🔄 Modificado
- Ação `Importar Second Brain` movida para dentro de `MindWorkspaceMenu` (menu do usuário) (#70).
- Menu contextual da seção de favoritos exibe ícone `StarOff` para remover dos favoritos (#71).

### 🐛 Corrigido
- Removida a estrela e indicador redundante de sincronia do cabeçalho superior, concentrando favoritos na sidebar e menu contextual (#63, #67).

### 🗑️ Removido
- Removido atalho duplicado de `Lixeira` das opções rápidas superiores da sidebar (#70).

---

## [0.2.0] - 2026-11-12

### 🚀 Adicionado
- **Novo cabeçalho Notion-like na barra lateral**:
  - Seletor de Workspace (`Mind de Luiz Gustavo Dias Pulz`) com menu drop-down completo (#46).
  - Informações de versão em tempo real (`v0.2.0 · Local-First`).
  - Botão de Ajuda `(?)` direcionando diretamente ao repositório GitHub do projeto (#46).
  - Menu Grid da direita `[:::]` com acesso rápido à Lixeira, Biblioteca, Tarefas e Habilidades (#46).
  - Atalho de Configurações acessível diretamente pelo menu do usuário/workspace (#46).
  - Modal e histórico visual de evolução do Mind Hub (#46).
- **Exclusão Definitiva na Lixeira (Purge & Hard Delete)**:
  - Botão de exclusão permanente individual por nota com confirmação preventiva (#46).
  - Ação global para esvaziar toda a lixeira de uma só vez (#46).
  - Endpoints de backend dedicados (`DELETE /api/pages/:id/permanent` e `POST /api/pages/trash/empty`) (#46).
- **Reordenação e Ergonomia do Editor Tiptap v2**:
  - Reordenação de blocos por arrastar e soltar (drag-and-drop) através da alça de gutter (`⠿`) (#43, #48).
  - Linha azul sutil indicadora de drop (#43).
  - Atalhos de teclado `Alt+ArrowUp` e `Alt+ArrowDown` para movimentação rápida de blocos (#43).
  - Menu flutuante de formatação (Bubble Menu) no cursor e Slash Menu (`/`) (#43).

### 🐛 Corrigido
- Calibrado alinhamento do gutter no editor para evitar sobreposição em telas menores (#48).
- Fechamento automático de menus drop-down no clique externo (#48).
- Exclusão permitida de divisores horizontais (`---`) no editor (#48).

---

## [0.1.0] - 2026-11-10

### 🚀 Adicionado
- **Arquitetura Local-First e Backend Fastify**:
  - Armazenamento em disco durável com fallback offline resiliente (#14, #15, #16).
  - Busca híbrida combinando texto completo e embeddings determinísticos em tempo real (< 1ms).
- **Blocos Inline de Banco de Dados**:
  - Visualização em Tabela e Kanban board com soft delete (#14, #15, #16).
  - Ciclo de status rápido e contadores agregados.
- **Importador em Massa do Second Brain**:
  - Motor de ingestão e parse de vaults Markdown com YAML frontmatter, pastas e WikiLinks (#17, #18, #19).
- **Diagramas Nativos**:
  - Renderização nativa de Mermaid, Excalidraw e Draw.io (#15).
- **Protocolo MCP e Assistente de IA**:
  - Servidor Model Context Protocol nativo com ferramentas para notas e banco de dados (#15).
  - Chat lateral com assistente BYOK (OpenAI, Anthropic, Gemini, Ollama) (#15, #16).

[Não lançado]: https://github.com/luizGDpulz/mind-hub/compare/v0.5.0...HEAD
[0.5.0]: https://github.com/luizGDpulz/mind-hub/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/luizGDpulz/mind-hub/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/luizGDpulz/mind-hub/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/luizGDpulz/mind-hub/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/luizGDpulz/mind-hub/releases/tag/v0.1.0
