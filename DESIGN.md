# DESIGN.md: GuiaCampus

Identidade visual do GuiaCampus, projeto de navegação assistida com IoT (óculos com sensor de distância, motor de vibração e telemetria). Derivada dos slides da Sprint 2. Use este arquivo como fonte de verdade ao criar páginas, slides, apps ou materiais do projeto.

## 1. Princípios
1. **Claro antes de bonito.** O público final inclui pessoas com deficiência visual e a equipe que explica o projeto. Contraste alto, texto curto, hierarquia óbvia.
2. **Campus acolhedor.** Céu, vegetação e vidro translúcido, sem aspecto de equipamento frio.
3. **Alerta com significado.** Vermelho e amarelo só aparecem quando há obstáculo ou foco. Nunca como decoração.
4. **Uma ideia por painel.** Título forte, uma ou duas linhas de apoio.

## 2. Logo
- **Símbolo:** óculos de duas lentes arredondadas, ondas de alerta saindo da lente direita e um ponto amarelo dentro dela (referência ao piso tátil).
- **Wordmark:** "GuiaCampus" em Plus Jakarta Sans 800, espaçamento -0.03em, sem separar as palavras nem trocar a cor de metade do nome.
- **Assinatura:** "Navegação assistida e IoT" em peso 600, no azul vivo, abaixo do wordmark (usar só em versões grandes).
- **Versões:** azul-marinho sobre azul-gelo ou branco; branco sobre azul-marinho ou azul vivo. O ponto amarelo fica sempre `#F2B705`.
- **Ícone de app:** quadrado de cantos 23% (34 px em 150 px), fundo azul vivo, símbolo branco.
- **Área de respiro:** pelo menos a altura de uma lente em todos os lados. Largura mínima do símbolo: 32 px.

```svg
<svg viewBox="0 0 120 64" width="190" fill="none" stroke="currentColor"
     stroke-width="5" stroke-linecap="round" aria-hidden="true">
  <rect x="4" y="16" width="36" height="30" rx="11"/>
  <rect x="48" y="16" width="36" height="30" rx="11"/>
  <path d="M40 28q4-5 8 0"/>
  <path d="M96 23a12 12 0 0 1 0 18M107 15a22 22 0 0 1 0 34"/>
  <circle cx="66" cy="31" r="4" fill="#F2B705" stroke="none"/>
</svg>
```
O símbolo usa `currentColor`: defina a cor no elemento pai.

## 3. Cores
| Token | Nome | Hex | Uso |
|---|---|---|---|
| `--gc-navy` | Azul-marinho | `#0B1E6B` | Títulos, texto, fundos escuros |
| `--gc-blue` | Azul vivo | `#0A4FE0` | Botões, selos, links, destaques |
| `--gc-sky` | Azul-céu | `#5BB5F5` | Ondas, gráficos, apoio |
| `--gc-ice` | Azul-gelo | `#E8F3FF` | Painéis e fundos claros |
| `--gc-yellow` | Amarelo-tátil | `#F2B705` | Foco, ponto do logo, marcações |
| `--gc-alert` | Alerta | `#D92D20` | Obstáculo, perigo, erro |
| `--gc-green` | Verde-campus | `#5FB34A` | Sucesso, status concluído |
| `--gc-white` | Branco | `#FFFFFF` | Superfícies, texto sobre cor escura |

Neutros auxiliares: `#D5E6F7` (bordas sobre claro) e `#BFE0F8` (fundo de palco, céu).

Proporção sugerida: 60% claros (branco e azul-gelo), 25% azul-marinho e azul vivo, 15% outros.

### Contraste (WCAG 2.x, razões calculadas)
| Texto | Fundo | Razão | Situação |
|---|---|---|---|
| Branco | Azul-marinho | 14,9:1 | Passa AAA |
| Branco | Azul vivo | 6,5:1 | Passa AA |
| Branco | Alerta | 4,8:1 | Passa AA |
| Azul-marinho | Azul-gelo | 13,2:1 | Passa AAA |
| Azul-marinho | Azul-céu | 6,6:1 | Passa AA |
| Azul-marinho | Amarelo-tátil | 8,2:1 | Passa AAA |
| Azul-marinho | Verde-campus | 5,7:1 | Passa AA |
| Azul vivo | Branco | 6,5:1 | Passa AA |
| Azul vivo | Azul-gelo | 5,8:1 | Passa AA |

Regras: não usar branco sobre azul-céu, amarelo ou verde; não usar amarelo como cor de texto sobre fundo claro; não distinguir estados só pela cor (acompanhar com ícone ou texto).

## 4. Tipografia
Família única: **Plus Jakarta Sans** (Google Fonts), pesos 500, 600 e 800. Fallback: `system-ui, sans-serif`.

```css
@import url("https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;800&display=swap");
```

| Papel | Peso | Tamanho | Espaçamento | Entrelinha |
|---|---|---|---|---|
| Display (logo, capa) | 800 | 96–104 px | -0.03em | 1.0 |
| Título | 800 | 40–56 px | -0.02 a -0.03em | 1.05 |
| Subtítulo | 600 | 24–30 px | 0 | 1.2 |
| Corpo | 500 | 17–18 px | 0 | 1.5 |
| Rótulo, selo, botão | 600 | 16–17 px | 0 | 1.2 |

Regras: texto de corpo com no máximo 70 caracteres por linha; frases em caixa de sentença (sem caixa alta); sem destacar uma única palavra do título com outra cor.

## 5. Forma, espaço e profundidade
- **Raios:** painéis 28 px; cartões 22–24 px; ícone de app 23%; botões e selos totalmente arredondados (999 px).
- **Espaçamento:** base de 4 px; usar 8, 12, 16, 20, 24, 36, 48, 56. Padding de painel: 36 px; de cartão: 22–26 px.
- **Vidro:** fundo `rgba(255,255,255,.78)`, sombra `0 12px 30px rgba(11,30,107,.15)`. Uma sombra só, sempre azul-marinho translúcido.
- **Grade:** 8 px; blocos alinhados à esquerda, com um único ponto de ênfase por tela.

## 6. Componentes
- **Botão primário:** fundo azul vivo, texto branco, peso 600, raio total, padding 14 × 26 px (altura mínima de 44 px). Foco: anel de 2 px em amarelo-tátil com 2 px de distância.
- **Botão secundário:** transparente, borda de 2 px e texto azul-marinho, mesmo tamanho.
- **Selo (pill):** fundo azul vivo, texto branco, peso 600, padding 8 × 18 px. Exemplo: "Sprint 2".
- **Painel de vidro:** ver seção 5, com um título (peso 800), um parágrafo e no máximo uma ação.
- **Cartão de alerta:** fundo branco, raio 22 px, círculo de 64 px em `--gc-alert` com ícone de alerta branco, título em peso 800 (ex.: "Obstáculo a 90 cm") e linha de apoio em peso 500 (ex.: "Vibração em 40%").
- **Status:** concluído em verde-campus com ícone de check; em andamento em azul vivo; próximo em azul-gelo com borda. Sempre com texto junto.

## 7. Ícones
Traço de 1,8 px, pontas e junções arredondadas, grade de 24 px, cor azul-marinho (branco sobre fundo escuro). Conjunto base: óculos, pin de localização, alerta (triângulo), nuvem, ondas de sinal. Ícones de ação dentro de círculos de 64–76 px, fundo branco ou azul-gelo. Ícones decorativos recebem `aria-hidden="true"`; os que carregam significado recebem `aria-label`.

## 8. Imagem e ilustração
Ilustração em estilo vetorial suave, com campus ensolarado (prédios claros, árvores, piso tátil amarelo), personagem de moletom azul com óculos e bengala branca e vermelha. Fotos reais, quando usadas, mostram o protótipo montado, com fundo limpo. Evitar imagens que retratem a deficiência de forma vitimizadora.

## 9. Tom de voz
Direto e acolhedor. Frases curtas, verbos de ação, nenhum jargão para quem usa o óculos. Termos técnicos (I2C, BLE, FreeRTOS) ficam em materiais para a equipe, sempre com uma explicação simples na primeira vez. Exemplos: "Obstáculo à frente" em vez de "Anomalia detectada"; "Ver modelo 3D" em vez de "Enviar".

## 10. Movimento
Movimento só responde a uma ação (abrir, selecionar, confirmar), com 150–250 ms e curva suave. Respeitar `prefers-reduced-motion`. No modelo 3D, a vibração do motor e as ondas somem nesse modo.

## 11. Acessibilidade (mínimo obrigatório)
- Texto com contraste de pelo menos 4,5:1 (3:1 a partir de 24 px).
- Alvos de toque de no mínimo 44 × 44 px.
- Foco de teclado sempre visível.
- Elementos clicáveis são `<button>` ou `<a>`, nunca `<div>` com evento.
- Imagens informativas com texto alternativo; decorativas com `alt=""` ou `aria-hidden`.
- Alerta nunca depende só de cor: junto vão ícone, texto e, no produto, vibração.

## 12. Tokens prontos
```css
:root{
  --gc-navy:#0B1E6B; --gc-blue:#0A4FE0; --gc-sky:#5BB5F5; --gc-ice:#E8F3FF;
  --gc-yellow:#F2B705; --gc-alert:#D92D20; --gc-green:#5FB34A; --gc-white:#FFFFFF;
  --gc-border:#D5E6F7; --gc-stage:#BFE0F8;
  --gc-font:"Plus Jakarta Sans",system-ui,sans-serif;
  --gc-radius-panel:28px; --gc-radius-card:22px; --gc-radius-pill:999px;
  --gc-shadow:0 12px 30px rgba(11,30,107,.15);
}
```

## 13. Alinhamento pendente com o modelo 3D
A página do óculos 3D foi feita antes desta identidade e usa laranja (`#e8541a`, `#ff6a2b`) para destaque e feixe do sensor, e cinza-azulado como fundo. Para alinhar: destaque e foco em `--gc-yellow`, feixe do sensor em `--gc-sky` com opacidade, ondas de vibração em `--gc-alert`, botões e slider em `--gc-blue`, fundo em `--gc-stage` e fonte Plus Jakarta Sans.

## 14. O que evitar
- Preto puro, cinzas frios e roxos que não existem na paleta.
- Gradientes decorativos, emojis em interfaces, sombras duras.
- Vermelho como cor de marca; ele é só de alerta.
- Alterar proporções do símbolo ou separar as ondas das lentes.
