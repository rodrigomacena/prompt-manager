# Prompt Manager

Nó customizado para o [ComfyUI](https://github.com/comfyanonymous/ComfyUI) para guardar seus prompts favoritos organizados em grupos, revisá-los visualmente em um grid, avaliá-los com estrelas e reutilizá-los como saída de texto no seu workflow.

## Funcionalidades

- **Grupos de prompts**: organize prompts em grupos nomeados (ex.: "Retrato", "Paisagem").
- **Grid visual**: os prompts de um grupo aparecem como blocos em grade, com o texto e a avaliação em estrelas.
- **Avaliação em estrelas (1 a 5)**: clique nas estrelas de cada bloco para avaliar.
- **Adicionar / excluir prompts**: botão "+" para adicionar; cada bloco tem um botão de exclusão. Grupos também podem ser excluídos.
- **Modo de saída**: escolha entre `Escolhido` (o prompt selecionado manualmente), `Aleatório` (sorteia um prompt do grupo a cada execução) ou `Sequencial` (percorre os prompts do grupo em ordem, avançando a cada execução).
- **Backup e restauração por grupo**: um botão discreto (💾) no topo do nó permite baixar um grupo como arquivo `.json` ou restaurar um grupo a partir de um backup.

## Instalação

1. Copie (ou clone) esta pasta para dentro de `ComfyUI/custom_nodes/`:

   ```bash
   cd ComfyUI/custom_nodes
   git clone https://github.com/rodrigomacena/prompt-manager.git
   ```

2. Reinicie o ComfyUI.
3. O nó aparece no menu como **Prompt Manager** (categoria `utils/prompt`).

Não há dependências Python além das já incluídas no ComfyUI (`aiohttp`).

## Armazenamento

Os grupos e prompts ficam salvos em `user/default/PromptManager/prompt_manager_db.json` dentro da pasta de dados do ComfyUI (via `folder_paths.get_user_directory()`), então persistem entre atualizações do nó. Os backups por grupo são arquivos `.json` independentes, no formato:

```json
{
  "name": "Retrato",
  "prompts": [
    { "text": "closeup portrait, soft light...", "rating": 5 }
  ]
}
```

## Saída

O nó tem uma única saída `STRING` com o texto do prompt resultante do modo escolhido.

## Status de testes

Testado manualmente em uma instância real do ComfyUI Desktop (nó carregado sem erros). Fluxos validados: criar/renomear/excluir grupo, adicionar/avaliar/excluir prompt, seleção de prompt, troca entre os modos Escolhido/Aleatório/Sequencial (sincronização com os widgets internos que o Python lê), backup (download do JSON do grupo) e restauração/ciclo sequencial (validados na camada de armazenamento).

## Licença

MIT — veja [LICENSE](LICENSE).
