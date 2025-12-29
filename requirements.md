# Requirements: mimi-memory CLI

## Project Overview
mimi-memory is a CLI tool designed to provide AI agents with advanced storage and retrieval capabilities. It enables agents to manage different types of memory and perform sophisticated searches using a combination of entity and phrase matching, similar to hybrid graph/vector search.

## Functional Requirements
### 1. Configuration
- **Location**: The CLI must read configuration from `~/.mimi/settings.json`.
- **Structure**: The configuration file shall define:
    - **Providers**: Reusable LLM provider configurations.
      ```json
      "providers": {
        "google": {
          "api_key": "key",
          "model": "model_id"
        }
      }
      ```
    - **Pipeline**: Map of extraction steps, linking specific prompts and providers.
      ```json
      "pipeline": {
        "episodic": {
          "provider": "google",
          "prompt": "Extract the specific events and experiences from the following text..."
        },
        "semantic": {
          "provider": "google",
          "prompt": "Extract the core facts and concepts from the following text..."
        }
      }
      ```

### 2. Extraction Pipeline
- The system shall operate as an extraction pipeline where raw input is processed through multiple defined steps.
- **Mandatory Step**: **Entity Extraction**
    - The pipeline must include a step to identify and extract entities and their relationships (graph nodes and edges) from the input.
    - These entities will populate the graph layer used for search boosting.
- **Pipeline Steps**: Each step is a distinct unit of work (e.g., "Extract Episodic Memory") containing:
    - **Prompt**: The specific instruction or template sent to the LLM.
    - **Provider**: A reference to one of the configured LLM providers to execute the prompt.
- **Reusability**: A single provider configuration must be usable by multiple distinct steps.

### 3. Memory Input & Processing
- **Commands**: 
    - `mimi add "<text>" [metadata flags]`: Add a raw memory directly from a string.
    - `mimi add --file <path> [metadata flags]`: Add a raw memory from the contents of a file.
- **Metadata**: 
    - The CLI must accept arbitrary metadata flags (e.g., `--project "main"`, `--userid "123"`).
    - Metadata is stored alongside the memory in LanceDB and used for filtering results.
- **Processing Flow**: Raw input is passed through the configured extraction pipeline to generate:
    - **Raw Memory**: Stored as-is in LanceDB with attached metadata.
    - **Episodic Memory**: Extracted via pipeline step.
    - **Semantic Memory**: Extracted via pipeline step.
    - **Procedural Memory**: Extracted via pipeline step.
    - **Entities & Relationships**: Mandatory extraction to populate the graph layer.

### 4. Search & Retrieval
- **Command**: `mimi query "<phrase>" [--entity <entity_name>] [metadata flags]`
- **Parameters**:
    - `phrase`: A string representing the search query or phrase.
    - `--entity`: (Optional) A specific entity name to target in the graph-based search.
    - `[metadata flags]`: Arbitrary flags (e.g., `--project "main"`) used to filter results based on stored metadata.
- **Search Logic**:
    - **Filtering**: Apply metadata filters to narrow down the search space before/during vector search.
    - **Hybrid Search**: Combine phrase matching and entity-based graph traversal on the filtered set.
    - **Relevance Ranking**: Results are ranked by a relevance score.
    - **Graph Boosting**: Entity graph relationships are utilized to boost the relevance score of connected memories.
- **Output**:
    - **Default**: Human-readable text displaying a list of memory results sorted by relevance.
    - **Agent Mode**: Support a `--json` flag to output structured JSON data for easy parsing by AI agents.
    - Each result includes memory content, relevance score, type (raw/episodic/etc.), and associated metadata.

### 5. Memory Management
- **List**: `mimi list [metadata flags]`
    - Lists stored memories, optionally filtered by metadata.
    - Useful for agents to browse recent or project-specific history.
- **Get**: `mimi get <memory_id>`
    - Retrieves the full details of a specific memory by its unique ID.
- **Delete**: `mimi delete <memory_id>`
    - Permanently removes a memory and its associated vectors/graph nodes from storage.

### 6. Data Storage
- **Engine**: Use **LanceDB** as the primary embedded database.
- **Persistence**: All data must be stored locally within the `~/.mimi/` directory.
- **Schema**: LanceDB will store:
    - Raw, episodic, semantic, and procedural memory content.
    - Vector embeddings for each memory type to enable similarity search.
    - Entity nodes and their relationships to support graph-based boosting.
    - Metadata (e.g., project, userid) for filtering.

## Acceptance Criteria
<!-- To be defined -->
