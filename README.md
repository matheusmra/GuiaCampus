#  GuiaCampus - Óculos IoT para navegação assistida de deficientes visuais 👓

## Alunos integrantes da equipe

* Gabriel Chaves Mendes
* Guilherme Henrique da Silva Teodoro
* Marcella Santos Belchior
* Matheus de Almeida Moreira
* Yasmin Torres Moreira dos Santos

## Professores responsáveis

* Felipe Domingos da Cunha
* Luís Fabrício Wanderley Góes
* Matheus Alcântara Souza
* Max do Val Machado

## Resumo

O projeto GuiaCampus consiste no desenvolvimento de uma tecnologia assistiva vestível, em formato de óculos inteligente, destinada a ampliar a autonomia e a segurança de pessoas com deficiência visual. O dispositivo atua como um "para-choque virtual", detectando obstáculos em múltiplos ângulos (especialmente na altura da cabeça) e variações de inclinação no terreno, fornecendo feedback tátil imediato ao usuário. 

Além de atuar localmente, o sistema é concebido como um nó de Internet das Coisas (IoT). Utilizando um Sistema Operacional de Tempo Real (FreeRTOS) para o escalonamento crítico de tarefas e protocolos de rede leves para telemetria, o projeto integra de forma prática os conceitos de Sistemas Operacionais, Redes de Computadores e Arquitetura de Hardware.

## Problema

A bengala tradicional, embora seja a ferramenta de mobilidade mais comum para deficientes visuais, possui uma limitação severa: não consegue detectar obstáculos suspensos ou na altura do rosto (como galhos de árvores, placas ou extintores de incêndio). Colisões com esses objetos representam um risco constante de lesões. Além disso, a ausência de sistemas autônomos que monitorem a postura e a marcha do usuário em tempo real impede a detecção rápida de quedas ou acidentes, atrasando possíveis socorros em cenários de emergência.

## Solução proposta

A solução proposta é o desenvolvimento de um protótipo de óculos instrumentado (wearable) de baixo custo e alta eficiência. O sistema utiliza sensores de distância a laser baseados em tempo de voo (Time-of-Flight) e uma Unidade de Medida Inercial (IMU) para mapear o ambiente tridimensional à frente do usuário e sua postura. 

Quando uma ameaça é detectada, atuadores de vibração embutidos nas hastes do óculos disparam alertas táteis com intensidade proporcional à proximidade do obstáculo. O dispositivo também conta com conectividade Wi-Fi para, no futuro, transmitir dados de telemetria e alertas de emergência (como quedas bruscas) para a nuvem.

## Arquitetura da solução

A arquitetura do GuiaCampus é dividida em três camadas principais:

1. **Hardware (Percepção e Atuação):**
   * **Processamento:** Microcontrolador ESP32-C3 SuperMini.
   * **Sensores:** 3x VL53L0X (Sensores ToF para mapeamento frontal, superior e inferior) e 1x MPU6050 (Acelerômetro e Giroscópio para detecção de inclinação e quedas).
   * **Atuadores:** Micro motores de vibração tipo "moeda".
   * **Alimentação:** Bateria LiPo 3.7V com módulo gerenciador de carga e proteção TP4056.

2. **Sistemas Operacionais (Controle em Tempo Real):**
   * Utilização do **FreeRTOS** nativo do ESP32 para gerenciamento multitarefa.
   * Separação de *Threads* para leitura de sensores, controle de vibração e rotinas de rede.
   * Implementação de *Mutex* para garantir o acesso seguro e sem colisões ao barramento de comunicação compartilhado.
   * Escalonamento preemptivo com prioridade máxima para a thread de alerta de colisão.

3. **Redes e Comunicação (Telemetria):**
   * **Comunicação Local (Barramento):** Protocolo I2C para integração miniaturizada dos múltiplos sensores (Master-Slave) usando apenas dois fios (SDA/SCL).
   * **Comunicação Externa (IoT):** Pilha TCP/IP operando via Wi-Fi, com uso planejado do protocolo MQTT para publicação de alertas de queda em um servidor *broker*, permitindo futuras análises de latência e modelos de filas.

## Tecnologias utilizadas

* **Linguagens:** C/C++
* **Sistema Operacional:** FreeRTOS
* **Protocolos e Comunicação:** I2C, MQTT, Wi-Fi
* **Simulação e Modelagem:** Autodesk Tinkercad (validação lógica e esquemática), Software de Fatiamento 3D (para a estrutura do óculos EPI)
* **Ferramentas:** IDE compatível (Arduino IDE), Git e GitHub (Versionamento e repositório)

## Instrções de utilização

Em breve...

## Estrutura do repositório

* **`/Codigo`** - Codigo-fonte, scripts, notebooks, testes, dados de exemplo e demais arquivos necessarios para executar ou reproduzir a solucao computacional. Organize esta pasta conforme as exigencias da disciplina e a natureza do projeto.
* **`/Documentacao`** - Relatorios, requisitos, arquitetura, metodologia e documentacao tecnica.
* **`/Artefatos`** - Atas, canvas, diagramas, prototipos, especificacoes e demais artefatos produzidos.
* **`/Divulgacao`** - Apresentacoes, videos, imagens e materiais de divulgacao.
