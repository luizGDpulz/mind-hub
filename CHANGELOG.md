# Changelog

Todas as mudanças notáveis deste projeto serão documentadas neste arquivo.
O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e este projeto adere ao [Versionamento Semântico](https://semver.org/lang/pt-BR/).

---

## [Não lançado]

### 🚀 Adicionado
- Melhorias contínuas em homologação.

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

[Não lançado]: https://github.com/luizGDpulz/mind-hub/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/luizGDpulz/mind-hub/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/luizGDpulz/mind-hub/releases/tag/v0.1.0
