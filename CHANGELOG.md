# Changelog

Todas as mudanças notáveis deste projeto serão documentadas neste arquivo.
O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e este projeto adere ao [Versionamento Semântico](https://semver.org/lang/pt-BR/).

---

## [0.2.0] - 2026-11-11

### 🚀 Adicionado
- **Novo cabeçalho Notion-like na barra lateral**:
  - Seletor de Workspace (`Mind de Luiz Gustavo Dias Pulz`) com menu drop-down completo.
  - Informações de versão em tempo real (`v0.2.0 · Local-First`).
  - Botão de Ajuda `(?)` direcionando diretamente ao repositório GitHub do projeto.
  - Menu Grid da direita `[:::]` com acesso rápido à Lixeira, Biblioteca, Tarefas e Habilidades.
  - Atalho de Configurações acessível diretamente pelo menu do usuário/workspace.
  - Modal e histórico visual de evolução do Mind Hub.
- **Exclusão Definitiva na Lixeira (Purge & Hard Delete)**:
  - Botão de exclusão permanente individual por nota com confirmação preventiva.
  - Ação global para esvaziar toda a lixeira de uma só vez.
  - Endpoints de backend dedicados (`DELETE /api/pages/:id/permanent` e `POST /api/pages/trash/empty`).
- **Reordenação e Ergonomia do Editor Tiptap v2**:
  - Reordenação de blocos por arrastar e soltar (drag-and-drop) através da alça de gutter (`⠿`).
  - Linha azul sutil indicadora de drop.
  - Atalhos de teclado `Alt+ArrowUp` e `Alt+ArrowDown` para movimentação rápida de blocos.
  - Menu flutuante de formatação (Bubble Menu) no cursor e Slash Menu (`/`).

---

## [0.1.0] - 2026-11-10

### 🚀 Adicionado
- **Arquitetura Local-First e Backend Fastify**:
  - Armazenamento em disco durável com fallback offline resiliente.
  - Busca híbrida combinando texto completo e embeddings determinísticos em tempo real (< 1ms).
- **Blocos Inline de Banco de Dados**:
  - Visualização em Tabela e Kanban board com soft delete.
  - Ciclo de status rápido e contadores agregados.
- **Diagramas Nativos**:
  - Renderização nativa de Mermaid, Excalidraw e Draw.io.
- **Protocolo MCP e Assistente de IA**:
  - Servidor Model Context Protocol nativo com ferramentas para notas e banco de dados.
  - Chat lateral com assistente BYOK (OpenAI, Anthropic, Gemini, Ollama).
