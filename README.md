# Roda de Vôlei

Site da Roda de Vôlei da E.E. Marlene Leite da Silva.

## Sobre o projeto

A Roda de Vôlei é uma tradição criada e mantida pelos alunos. O site registra a atividade, apresenta fotos, informa o status atual da roda e reúne um catálogo de jogos passatempo.

## Stack

- HTML5
- CSS3
- JavaScript vanilla
- GitHub Pages
- Microsoft Clarity para análise de uso

Não há framework ou backend. O projeto foi mantido como site estático para reduzir complexidade e facilitar manutenção.

## Estrutura

```text
/
├── index.html
├── style.css
├── script.js
├── README.md
├── .github/
│   └── workflows/
│       └── validate.yml
└── imagens e demais assets
```

## Funcionalidades

- Apresentação da Roda de Vôlei.
- Status automático durante os dias úteis, das 17h às 19h.
- Galerias horizontais independentes.
- Navegação anterior/próxima nas galerias.
- Lightbox acessível para visualização das fotos.
- Botão com instruções de participação.
- Acesso ao Instagram da Roda de Vôlei.
- Catálogo externo de jogos passatempo.
- Carregamento lazy das imagens da galeria.

## Horário

A regra atual do status considera a roda ativa de segunda a sexta-feira, das 17:00 inclusive até 19:00 exclusivo.

Essa regra está centralizada em `script.js` nas constantes `RODA_START_HOUR` e `RODA_END_HOUR`.

## Desenvolvimento

Como o projeto é estático, basta servir a pasta do projeto com qualquer servidor HTTP local ou abrir o `index.html` diretamente para uma inspeção básica. Para uma experiência mais próxima do ambiente publicado, prefira um servidor local.

Antes de publicar alterações, o workflow `Validate static site` verifica arquivos essenciais, referências locais, sintaxe JavaScript e marcadores de conflito do Git.

## Organização futura

Os assets de imagem ainda permanecem na raiz por compatibilidade com os caminhos existentes. A próxima etapa de manutenção pode migrá-los para `assets/images/`, acompanhada de atualização das referências e otimização real para WebP/AVIF.

## Histórico

O repositório começou em junho de 2026 e atualmente mantém a implementação como um site estático simples.
