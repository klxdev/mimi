# Implementation Specification: mimi-memory CLI

This document serves as the authoritative technical blueprint for implementing the `mimi-memory` CLI. Follow these specifications strictly.

## 1. Project Structure & File Organization

All code resides in `packages/cli/src`.

```text
packages/cli/src/
├── commands/               # CLI Command implementations
│   ├── add.ts              # 'mimi add'
│   ├── query.ts            # 'mimi query'
│   ├── list.ts             # 'mimi list'
│   ├── get.ts              # 'mimi get'
│   └── delete.ts           # 'mimi delete'
├── config/                 # Configuration management
│   ├── index.ts            # Config loader
│   └── schema.ts           # Zod schemas for settings.json
├── lib/
│   ├── ai/                 # LLM Integration
│   │   ├── factory.ts      # Provider factory
│   │   ├── types.ts        # AI Interfaces
│   │   └── providers/      # Individual providers
│   │       └── openai.ts   # (Example)
│   ├── pipeline/           # Extraction Pipeline
│   │   ├── engine.ts       # Main pipeline logic
│   │   └── steps/          # Step implementations
│   │       ├── entity-extraction.ts
│   │       └── dynamic-step.ts
│   ├── storage/            # Database Layer
│   │   ├── db.ts           # LanceDB connection/setup
│   │   ├── repository.ts   # CRUD operations
│   │   └── schema.ts       # LanceDB table schemas
│   └── utils/
│       ├── formatting.ts   # Output formatting (JSON/Text)
│       └── paths.ts        # XDG/Home directory resolution
├── types/                  # Shared Domain Types
│   └── index.ts
└── index.ts                # Entry point (Commander setup)
```

## 2. Core Domain Types (`src/types/index.ts`)

Define these shared interfaces first.

```typescript
export type MemoryType = 'raw' | 'episodic' | 'semantic' | 'procedural';

export interface MemoryMetadata {
  projectId?: string;
  userId?: string;
  sourceFile?: string;
  [key: string]: any;
}

export interface Memory {
  id: string;
  content: string;
  type: MemoryType;
  createdAt: string; // ISO Date
  metadata: MemoryMetadata;
  entityIds: string[]; // Foreign keys to Entity nodes
}

export interface Entity {
  id: string;
  name: string;
  type: string;
  description?: string;
}
```

## 3. Configuration Module (`src/config/`)

### 3.1 `src/config/schema.ts`
Use `zod` to validate `~/.mimi/settings.json`.

```typescript
import { z } from 'zod';

export const ProviderConfigSchema = z.object({
  apiKey: z.string(),
  model: z.string(),
  endpoint: z.string().optional(),
  // Add other provider-specific fields
});

export const PipelineStepSchema = z.object({
  provider: z.string(), // Must match a key in providers
  prompt: z.string(),
});

export const ConfigSchema = z.object({
  providers: z.record(ProviderConfigSchema),
  pipeline: z.record(PipelineStepSchema),
});

export type Config = z.infer<typeof ConfigSchema>;
```

### 3.2 `src/config/index.ts`
- **Function**: `loadConfig()`
- **Logic**:
    1. Resolve path `~/.mimi/settings.json`.
    2. If missing, throw specific `ConfigNotFoundError`.
    3. Read file, parse JSON.
    4. `ConfigSchema.parse(json)` to validate.
    5. Return typed Config object.

## 4. AI & Pipeline Layer (`src/lib/ai/`, `src/lib/pipeline/`)

### 4.1 AI Interfaces (`src/lib/ai/types.ts`)

```typescript
export interface LLMRequest {
  prompt: string;
  systemInstruction?: string;
}

export interface LLMResponse {
  text: string;
  usage?: { input: number; output: number };
}

export interface ILLMProvider {
  generate(request: LLMRequest): Promise<LLMResponse>;
  embed(text: string): Promise<number[]>;
}
```

### 4.2 Pipeline Engine (`src/lib/pipeline/engine.ts`)
- **Class**: `PipelineEngine`
- **Constructor**: Accepts `Config`.
- **Method**: `process(input: string, metadata: MemoryMetadata): Promise<ProcessingResult>`
- **Workflow**:
    1. **Step 0**: Create "Raw Memory" object.
    2. **Step 1 (Mandatory)**: "Entity Extraction".
        - Use a default internal prompt if not in config, or force user to configure it.
        - Parse LLM output (expect JSON list of entities).
    3. **Step 2..N (Configured)**: Iterate `Object.entries(config.pipeline)`.
        - For each step (e.g., "episodic"), find the provider.
        - call `provider.generate(step.prompt + "\nInput: " + input)`.
        - Create a Memory object of type `stepKey` (if valid) or generic `semantic`.
    4. **Embedding**: Generate embeddings for ALL created memories and entities.
    5. **Return**: Collection of Memories and Entities to save.

## 5. Storage Layer (`src/lib/storage/`)

### 5.1 LanceDB Setup (`src/lib/storage/db.ts`)
- Use `lancedb` (Node.js).
- **Path**: `path.join(homedir, '.mimi', 'data')`.
- **Tables**: Ensure tables exist on startup.

### 5.2 Schemas (`src/lib/storage/schema.ts`)
Define LanceDB schemas. Note: LanceDB uses strict types.

```typescript
// Pseudo-code for LanceDB schema
const MemoryTableSchema = {
  id: "utf8",
  content: "utf8",
  type: "utf8",
  vector: "vector[1536]", // Dimension depends on embedding model!
  metadata: "json",       // LanceDB supports struct or JSON string
  created_at: "timestamp",
};
```
*Note: Ensure the embedding dimension is configurable or standardized (default to OpenAI's 1536 or similar).*

## 6. CLI Commands (`src/commands/`)

### 6.1 `add.ts`
- **Signature**: `mimi add <content>`
- **Options**: `--file <path>`, `--project <val>`, `--userid <val>`, etc.
- **Logic**:
    1. Read input (string or file).
    2. Collect arbitrary flags into `metadata` object.
    3. `PipelineEngine.process(input, metadata)`.
    4. `Repository.saveBatch(result)`.
    5. Print summary ("Saved 1 raw, 2 episodic, 5 entities...").

### 6.2 `query.ts`
- **Signature**: `mimi query <phrase>`
- **Options**: `--entity <name>`, `--json` plus arbitrary metadata flags.
- **Logic**:
    1. **Embedding**: Embed the search `phrase`.
    2. **Filter Construction**: Convert metadata flags to SQL-like filter (e.g., `metadata.project = 'main'`)
    3. **Search**:
        - `table.search(vector).filter(whereClause).limit(10).execute()`.
    4. **Graph Boost** (If `--entity` provided):
        - Fetch entity ID by name.
        - Perform secondary search or re-ranking logic: increase score if memory.entityIds contains entity.id.
    5. **Output**: Print table or JSON.

## 7. Implementation Steps for Agent

1.  **Scaffold**: Set up `commander`, `zod`, and basic directory structure.
2.  **Config & Storage**: Implement `ConfigManager` and `StorageService` (LanceDB setup).
3.  **LLM & Pipeline**: Implement `LLMProvider` logic and the `PipelineEngine`.
4.  **Commands**: Implement `mimi add` (Input -> Pipeline -> Storage).
5.  **Commands**: Implement `mimi list/get/delete`.
6.  **Commands**: Implement `mimi query` (Search Logic).
7.  **Testing**: Unit tests for pipeline and storage integration.