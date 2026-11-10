# Relatório de acessibilidade

**Escopo:** análise estática do frontend do DMS, conforme WCAG 2.2 nível AA.  
**Data:** 2026-11-10  
**Método:** inspeção do JSX, HTML e CSS; cálculo de contraste de cores usadas em texto. Não foram executados testes automatizados nem testes manuais em navegador.

## Resultado

Não foram identificadas violações inequívocas da WCAG no código inspecionado. A interface inclui suporte explícito a teclado, nomes e rótulos para controles, anúncios de estados e estilos para movimento reduzido. O resultado é preliminar: comportamento real com tecnologias assistivas, zoom e diferentes navegadores não foi verificado.

## Verificações

| Critério WCAG | Resultado | Evidência estática |
| --- | --- | --- |
| 1.3.1 Informações e relações | Atende no código | Regiões semânticas `header`, `main` e `footer`, hierarquia de títulos e seções com `aria-labelledby` em `frontend/src/App.jsx` e componentes. |
| 2.1.1 Teclado | Atende no código | Ações usam links, botões e controles nativos; o seletor de arquivo é um `input[type="file"]` associado a um `label` em `frontend/src/components/UploadComponent.jsx`. |
| 2.4.1 Ignorar blocos | Atende no código | Link “Pular para o conteúdo” aponta para `#main-content` em `frontend/src/App.jsx`. |
| 2.4.7 Foco visível | Atende no código | `:focus-visible` define contorno para botões, campos e links; `:focus-within` destaca o seletor de arquivo em `frontend/src/App.css`. |
| 2.4.11 Foco não obscurecido | Requer validação manual | A inspeção estática não identifica sobreposições persistentes, mas é necessário confirmar em execução que o foco não fica encoberto em diferentes tamanhos de tela e níveis de zoom. |
| 3.3.2 Rótulos ou instruções | Atende no código | O campo de identificador tem rótulo associado por `htmlFor`/`id`; o seletor de arquivo possui rótulo envolvente. |
| 4.1.2 Nome, função e valor | Atende no código | Controles nativos, botão de download com `aria-label` contextual e seções com nomes acessíveis definidos. |
| 4.1.3 Mensagens de estado | Atende no código | Carregamento, erros e resultado do upload usam `role="status"`, `role="alert"`, `aria-live` e/ou `aria-busy` em `DocumentList.jsx` e `UploadComponent.jsx`. |
| 1.4.3 Contraste mínimo | Atende nos pares avaliados | Textos avaliados: texto secundário 5,49:1; indicador de armazenamento 4,93:1; texto do arquivo 5,17:1; mensagens de erro 5,81:1. O detalhe verde do título tem 3,08:1 e é texto grande; o foco do seletor tem 6,32:1. |
| 1.4.4 / 1.4.10 Redimensionar texto e Reflow | Requer validação manual | Nomes de arquivo usam `white-space: nowrap`, `overflow: hidden` e reticências em `frontend/src/App.css`. Em telas estreitas ou com zoom, parte do nome pode não ficar visível; o atributo `title` não é uma alternativa confiável para toque ou teclado. |
| 2.3.3 Animação de interações | Atende no código | `prefers-reduced-motion: reduce` reduz transições e animações em `frontend/src/App.css`. |

## Recomendação

Permitir que nomes de arquivo quebrem linha ou ofereçam um modo acessível de consultar o nome completo, e validar a listagem em viewport estreita e com zoom de 200%. Isso é uma recomendação de verificação, não uma violação confirmada pela análise estática.

## Limitações

A análise não confirma ordem e operação do foco em execução, anúncios em leitores de tela, comportamento a 200% de zoom, reflow, compatibilidade entre navegadores ou ausência de violações detectáveis apenas no DOM renderizado. O repositório contém testes Playwright/axe em `frontend/a11/test`, mas eles não foram executados por orientação do prompt `a11-test`.
