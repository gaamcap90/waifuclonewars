// src/i18n/tutorial-translations.ts
// Translations for all TUTORIAL_STEPS entries in src/data/tutorialData.ts.
// Keys follow the pattern `${stage}_${stepIndex}`.

import type { Language } from './index';
import type { TutorialStage } from '@/data/tutorialData';

export type TutorialStepTranslation = { text: string; subtext?: string };

// Key: `${stage}_${stepIndex}`  e.g. "welcome_0", "s1_battle_3"
export type TutorialStepTranslations = Record<string, TutorialStepTranslation>;

// ── German ────────────────────────────────────────────────────────────────────

const DE: TutorialStepTranslations = {
  // welcome (2 steps)
  welcome_0: {
    text: 'Willkommen bei Waifu Clone Wars, Klon.',
    subtext:
      'Du wurdest vom Znyxorga-Imperium entführt und in ihren interdimensionalen Gladiatoren-Zirkus geworfen. Dieses Tutorial zeigt dir alles, was du zum Überleben brauchst. Es dauert etwa 5 Minuten.',
  },
  welcome_1: {
    text: 'Deine erste Aufgabe — überstehe ein Trainingsgefecht.',
    subtext:
      'Du kämpfst gegen einen geschwächten Gegner und lernst die Grundlagen von Bewegung und Kampf. Klicke den ersten Knoten, um zu beginnen.',
  },

  // s1_battle (5 steps)
  s1_battle_0: {
    text: 'Das ist Leonidas. Sie ist deine erste Kämpferin.',
    subtext:
      'Jede Figur hat LP (Lebenspunkte), Stärke (Nahkampfschaden), Kraft (Kartenschaden), Verteidigung (Schadensreduzierung) und Bewegungsreichweite. Schau dir das Statistiken-Panel auf der linken Seite an.',
  },
  s1_battle_1: {
    text: 'Bewege Leonidas in Richtung des Feindes.',
    subtext:
      'Klicke Leonidas an, um sie auszuwählen, dann klicke auf ein leuchtendes grünes Feld, um sie zu bewegen. Grün = gültiges Bewegungsfeld.',
  },
  s1_battle_2: {
    text: 'Jetzt angreifen — Einfacher Angriff auf den Feind.',
    subtext: 'Klicke auf die Karte „Einfacher Angriff" und dann auf den Feind, um zuzuschlagen.',
  },
  s1_battle_3: {
    text: 'Guter Treffer! Klicke ZUG BEENDEN.',
    subtext:
      'Der Feind ist an der Reihe, dann ziehst du neue Karten und kannst erneut angreifen.',
  },
  s1_battle_4: {
    text: 'Mach ihn fertig!',
    subtext:
      'Du hast zwei Einfache Angriffe — einer reicht. Setze ihn gegen den Feind ein, um zu gewinnen.',
  },

  // s2_battle (3 steps)
  s2_battle_0: {
    text: 'Diesmal zwei Feinde. Lass uns über Mana sprechen.',
    subtext:
      'Du beginnst jeden Zug mit 5 Mana. Karten kosten unterschiedlich viel. Ungenutztes Mana geht am Zugende verloren.',
  },
  s2_battle_1: {
    text: 'Spiele „Schild hoch", um deine Verteidigung zu stärken.',
    subtext:
      'Klicke auf „Schild hoch", um bis zu deinem nächsten Zug +10 Verteidigung zu erhalten, dann klicke ZUG BEENDEN.',
  },
  s2_battle_2: {
    text: 'Besiege alle Feinde!',
    subtext: 'Du hast diesen Zug zwei Einfache Angriffe — setze sie gegen die Feinde ein.',
  },

  // s3_map (4 steps)
  s3_map_0: {
    text: 'Du hast eine Kartenbelohnung verdient — such dir eine aus!',
    subtext:
      'Diese Karte behältst du für den Rest deines Durchgangs. Sie wird dauerhaft deinem Deck hinzugefügt. Wähle die Karte, die am besten zu deiner Strategie passt.',
  },
  s3_map_1: {
    text: 'Das ist die Arena-Schaltkreis-Karte.',
    subtext:
      'Zwischen den Kämpfen reist du einen verzweigten Pfad entlang. Jeder Knoten bietet etwas Anderes. Du wählst deinen Weg — jeder Durchgang ist einzigartig.',
  },
  s3_map_2: {
    text: '⚔️ Kampf  ·  💀 Elite  ·  🏪 Laden  ·  🛏️ Rast  ·  👑 Boss',
    subtext:
      'Kampf = normaler Kampf · Elite = schwererer Kampf, bessere Beute · Laden = Gold ausgeben · Rast = LP heilen oder eine Karte aufwerten · Boss = Ende des Akts.',
  },
  s3_map_3: {
    text: 'Klicke den nächsten Kampf-Knoten, um weiterzumachen.',
    subtext:
      'In einem echten Durchgang verzweigen sich die Pfade zwischen Kämpfen, Rast-Knoten, Läden und Elites. Klicke jetzt auf den Kampf-Knoten, um fortzufahren.',
  },

  // s4_battle (3 steps)
  s4_battle_0: {
    text: 'Napoleon hat sich deinem Trupp angeschlossen!',
    subtext:
      'Du kontrollierst jetzt zwei Kämpferinnen. Beide agieren jeden Zug — du bestimmst die Reihenfolge. Jede hat eigene Karten, aber ihr teilt euch einen Mana-Vorrat.',
  },
  s4_battle_1: {
    text: 'Nutze die Aktiv-Einheiten-Leiste oben, um Kämpfer zu wechseln.',
    subtext:
      'Klicke auf ein Portrait in der Leiste, um die Kontrolle zu übernehmen, oder klicke einfach auf das Symbol auf dem Spielfeld. Beide müssen ihre Aktionen abschließen, bevor du den Zug beendest.',
  },
  s4_battle_2: {
    text: 'Setze beide Figuren ein — jede hat eine Karte „Einfacher Angriff".',
    subtext:
      'Wähle Leonidas und nutze ihren Einfachen Angriff. Wechsle dann zu Napoleon und nutze seinen. Gemeinsam besiegen sie jeden Feind.',
  },

  // s5_boss (2 steps)
  s5_boss_0: {
    text: 'Letzte Prüfung — ein Krath-Champion stellt sich dir.',
    subtext:
      'Nutze beide Kämpferinnen wie zuvor. Dieser Champion ist für das Training geschwächt — die echten sind es nicht.',
  },
  s5_boss_1: {
    text: 'Besiege den Champion, um das Tutorial abzuschließen!',
    subtext:
      'Jede Kämpferin hat einen Einfachen Angriff. Treffe zweimal und der Champion fällt.',
  },

  // s3b_campfire (2 steps)
  s3b_campfire_0: {
    text: 'Das ist ein Rast-Knoten — dein Erholungspunkt.',
    subtext:
      'Heile alle Figuren um 30 % ihrer maximalen LP oder werte eine Karte in deinem Deck zur stärkeren Version auf. Rast-Knoten sind dein wichtigstes Heilmittel zwischen den Kämpfen.',
  },
  s3b_campfire_1: {
    text: 'Heile dich, dann geht es zum nächsten Kampf.',
    subtext:
      'Napoleon schließt sich dir für den nächsten Kampf an — du solltest vorbereitet sein. Verlasse den Rast-Knoten, wenn du fertig bist.',
  },
};

// ── Korean ────────────────────────────────────────────────────────────────────

const KO: TutorialStepTranslations = {
  // welcome (2 steps)
  welcome_0: {
    text: '웨이후 클론 워즈에 오신 것을 환영합니다, 클론이여.',
    subtext:
      '당신은 Znyxorga 제국에 납치되어 그들의 차원간 검투사 서킷에 던져졌습니다. 이 튜토리얼은 살아남기 위해 필요한 모든 것을 가르쳐드립니다. 약 5분이 소요됩니다.',
  },
  welcome_1: {
    text: '첫 번째 임무 — 훈련 대결에서 살아남으세요.',
    subtext:
      '약해진 적과 싸우며 이동과 전투의 기초를 배우게 됩니다. 첫 번째 노드를 클릭하여 시작하세요.',
  },

  // s1_battle (5 steps)
  s1_battle_0: {
    text: '이 캐릭터는 Leonidas입니다. 당신의 첫 번째 전사입니다.',
    subtext:
      '모든 캐릭터는 HP(체력), 힘(근접 피해), 파워(카드 피해), 방어(피해 감소), 이동 범위를 가지고 있습니다. 왼쪽의 스탯 패널을 확인하세요.',
  },
  s1_battle_1: {
    text: 'Leonidas를 적 쪽으로 이동하세요.',
    subtext:
      'Leonidas를 클릭하여 선택한 후, 밝게 빛나는 초록색 육각형을 클릭하여 이동합니다. 초록색 = 유효한 이동 칸.',
  },
  s1_battle_2: {
    text: '이제 공격하세요 — 기본 공격 카드로 적을 공격합니다.',
    subtext: '기본 공격 카드를 클릭한 뒤, 적을 클릭하여 공격하세요.',
  },
  s1_battle_3: {
    text: '좋은 공격이에요! 턴 종료를 클릭하세요.',
    subtext: '적이 자신의 턴을 진행한 후, 새 카드를 뽑고 다시 행동할 수 있습니다.',
  },
  s1_battle_4: {
    text: '마무리하세요!',
    subtext:
      '기본 공격 카드가 두 장 있습니다 — 하나로도 충분합니다. 적에게 사용하여 승리하세요.',
  },

  // s2_battle (3 steps)
  s2_battle_0: {
    text: '이번에는 적이 두 명입니다. 마나에 대해 알아봅시다.',
    subtext:
      '매 턴 시작 시 마나 5를 받습니다. 카드마다 비용이 다릅니다. 사용하지 않은 마나는 턴이 끝나면 사라집니다.',
  },
  s2_battle_1: {
    text: '방어 강화 카드를 사용하여 방어력을 높이세요.',
    subtext:
      '방어 강화를 클릭하면 다음 턴까지 방어 +10을 얻습니다. 그런 다음 턴 종료를 클릭하세요.',
  },
  s2_battle_2: {
    text: '모든 적을 처치하세요!',
    subtext: '이번 턴에 기본 공격 카드가 두 장 있습니다 — 적들에게 사용하세요.',
  },

  // s3_map (4 steps)
  s3_map_0: {
    text: '카드 보상을 획득했습니다 — 하나를 선택하세요!',
    subtext:
      '선택한 카드는 이번 런이 끝날 때까지 유지됩니다. 덱에 영구적으로 추가됩니다. 전략에 맞는 카드를 선택하세요.',
  },
  s3_map_1: {
    text: '이곳이 아레나 서킷 지도입니다.',
    subtext:
      '전투 사이에 분기되는 경로를 따라 이동합니다. 각 노드는 서로 다른 것을 제공합니다. 경로는 직접 선택합니다 — 매 런마다 달라집니다.',
  },
  s3_map_2: {
    text: '⚔️ 전투  ·  💀 엘리트  ·  🏪 상점  ·  🛏️ 휴식  ·  👑 보스',
    subtext:
      '전투 = 일반 전투 · 엘리트 = 더 어려운 전투, 더 좋은 보상 · 상점 = 골드 소비 · 휴식 = HP 회복 또는 카드 강화 · 보스 = 막의 끝.',
  },
  s3_map_3: {
    text: '다음 전투 노드를 클릭하여 계속 진행하세요.',
    subtext:
      '실제 런에서는 전투, 휴식, 상점, 엘리트 사이에서 경로가 갈립니다. 지금은 전투 노드를 클릭하여 진행하세요.',
  },

  // s4_battle (3 steps)
  s4_battle_0: {
    text: 'Napoleon이 부대에 합류했습니다!',
    subtext:
      '이제 두 명의 전사를 조종합니다. 둘 다 매 턴 행동합니다 — 순서는 직접 결정합니다. 각자 고유한 카드를 가지며 마나 풀은 공유합니다.',
  },
  s4_battle_1: {
    text: '상단의 활성 유닛 바를 사용하여 전사를 전환하세요.',
    subtext:
      '바에서 초상화를 클릭하여 조종 대상을 바꾸거나, 보드에서 아이콘을 직접 클릭하면 됩니다. 턴을 종료하기 전에 두 캐릭터 모두 행동을 마쳐야 합니다.',
  },
  s4_battle_2: {
    text: '두 캐릭터를 모두 사용하세요 — 각자 기본 공격 카드를 가지고 있습니다.',
    subtext:
      'Leonidas를 선택하고 기본 공격을 사용하세요. 그다음 Napoleon으로 전환하여 그의 기본 공격을 사용하세요. 둘이 합치면 어떤 적도 쓰러뜨릴 수 있습니다.',
  },

  // s5_boss (2 steps)
  s5_boss_0: {
    text: '최종 시험 — Krath 챔피언이 당신 앞에 나타났습니다.',
    subtext:
      '이전처럼 두 전사를 모두 활용하세요. 이 챔피언은 훈련용으로 약화되어 있습니다 — 실제 챔피언은 그렇지 않습니다.',
  },
  s5_boss_1: {
    text: '챔피언을 처치하여 튜토리얼을 완료하세요!',
    subtext:
      '각 전사가 기본 공격을 가지고 있습니다. 둘 다 공격하면 챔피언이 쓰러집니다.',
  },

  // s3b_campfire (2 steps)
  s3b_campfire_0: {
    text: '이곳은 휴식 노드 — 회복 지점입니다.',
    subtext:
      '모든 캐릭터의 최대 HP 30%를 회복하거나, 덱의 카드 하나를 더 강력한 버전으로 강화할 수 있습니다. 휴식 노드는 전투 사이의 주요 회복 수단입니다.',
  },
  s3b_campfire_1: {
    text: '회복 후 다음 전투로 이동하세요.',
    subtext:
      'Napoleon이 다음 전투에 합류합니다 — 준비를 단단히 하세요. 준비가 되면 떠나세요.',
  },
};

// ── Brazilian Portuguese ───────────────────────────────────────────────────────

const PT_BR: TutorialStepTranslations = {
  // welcome (2 steps)
  welcome_0: {
    text: 'Bem-vindo a Waifu Clone Wars, Clone.',
    subtext:
      'Você foi abduzido pelo Império Znyxorga e jogado no circuito gladiatorial interdimensional deles. Este tutorial vai te ensinar tudo o que você precisa para sobreviver. Dura cerca de 5 minutos.',
  },
  welcome_1: {
    text: 'Sua primeira missão — sobreviva a um combate de treinamento.',
    subtext:
      'Você vai lutar contra um inimigo enfraquecido para aprender o básico de movimento e combate. Clique no primeiro nó para começar.',
  },

  // s1_battle (5 steps)
  s1_battle_0: {
    text: 'Esta é Leonidas. Ela é sua primeira guerreira.',
    subtext:
      'Todo personagem tem HP (vida), Força (dano corpo a corpo), Poder (dano de cartas), Defesa (redução de dano) e Alcance de Movimento. Confira o painel de atributos à esquerda.',
  },
  s1_battle_1: {
    text: 'Mova Leonidas em direção ao inimigo.',
    subtext:
      'Clique em Leonidas para selecioná-la, depois clique em um dos hexágonos verdes brilhantes para se mover. Verde = casa de movimento válida.',
  },
  s1_battle_2: {
    text: 'Agora ataque — use Ataque Básico no inimigo.',
    subtext: 'Clique na carta Ataque Básico e, em seguida, clique no inimigo para acertá-lo.',
  },
  s1_battle_3: {
    text: 'Bom golpe! Clique em ENCERRAR TURNO.',
    subtext:
      'O inimigo faz o turno dele, depois você compra novas cartas e age novamente.',
  },
  s1_battle_4: {
    text: 'Acabe com ele!',
    subtext:
      'Você tem dois Ataques Básicos — um já basta. Use-o no inimigo para vencer.',
  },

  // s2_battle (3 steps)
  s2_battle_0: {
    text: 'Dois inimigos desta vez. Vamos falar sobre Mana.',
    subtext:
      'Você começa cada turno com 5 de Mana. As cartas custam quantidades diferentes. O mana não utilizado é perdido ao fim do turno.',
  },
  s2_battle_1: {
    text: 'Jogue Escudo Erguido para aumentar sua Defesa.',
    subtext:
      'Clique em Escudo Erguido para ganhar +10 de Defesa até o seu próximo turno, depois clique em ENCERRAR TURNO.',
  },
  s2_battle_2: {
    text: 'Derrote todos os inimigos!',
    subtext:
      'Você tem dois Ataques Básicos neste turno — use-os nos inimigos.',
  },

  // s3_map (4 steps)
  s3_map_0: {
    text: 'Você ganhou uma recompensa de carta — escolha uma!',
    subtext:
      'Você mantém esta carta pelo resto da sua jornada. Ela é adicionada permanentemente ao seu baralho. Escolha a que melhor combina com sua estratégia.',
  },
  s3_map_1: {
    text: 'Este é o mapa do Circuito de Arena.',
    subtext:
      'Entre batalhas você percorre um caminho ramificado. Cada nó oferece algo diferente. Você escolhe sua rota — cada jornada é única.',
  },
  s3_map_2: {
    text: '⚔️ Combate  ·  💀 Elite  ·  🏪 Loja  ·  🛏️ Descanso  ·  👑 Chefe',
    subtext:
      'Combate = batalha padrão · Elite = combate mais difícil, loot melhor · Loja = gastar ouro · Descanso = recuperar HP ou melhorar uma carta · Chefe = fim do ato.',
  },
  s3_map_3: {
    text: 'Clique no próximo nó de combate para continuar.',
    subtext:
      'Em uma jornada real, os caminhos se ramificam entre combates, descansos, lojas e elites. Por agora, clique no nó de combate para prosseguir.',
  },

  // s4_battle (3 steps)
  s4_battle_0: {
    text: 'Napoleon se juntou ao seu esquadrão!',
    subtext:
      'Você controla agora duas guerreiras. Ambas agem em cada turno — você decide a ordem. Cada uma tem suas próprias cartas e vocês compartilham um pool de mana.',
  },
  s4_battle_1: {
    text: 'Use a barra de unidade ativa no topo para alternar guerreiras.',
    subtext:
      'Clique em um retrato na barra para mudar o controle, ou clique diretamente no ícone delas no tabuleiro. Ambas devem concluir suas ações antes de encerrar o turno.',
  },
  s4_battle_2: {
    text: 'Use os dois personagens — cada um tem uma carta de Ataque Básico.',
    subtext:
      'Selecione Leonidas e use o Ataque Básico dela. Depois alterne para Napoleon e use o dele. Juntos, eles derrubam qualquer inimigo.',
  },

  // s5_boss (2 steps)
  s5_boss_0: {
    text: 'Teste final — um Campeão Krath está diante de você.',
    subtext:
      'Use as duas guerreiras como antes. Este campeão está enfraquecido para o treinamento — os reais não estão.',
  },
  s5_boss_1: {
    text: 'Derrote o Campeão para concluir o tutorial!',
    subtext:
      'Cada guerreira tem um Ataque Básico. Acerte os dois e o campeão cai.',
  },

  // s3b_campfire (2 steps)
  s3b_campfire_0: {
    text: 'Este é um Nó de Descanso — seu ponto de recuperação.',
    subtext:
      'Recupere 30% do HP máximo de todos os personagens, ou melhore uma carta do seu baralho para uma versão mais poderosa. Os nós de descanso são sua principal fonte de cura entre batalhas.',
  },
  s3b_campfire_1: {
    text: 'Recupere suas forças e siga para a próxima batalha.',
    subtext:
      'Napoleon se juntará a você no próximo combate — vale a pena estar preparado. Saia quando estiver pronto.',
  },
};

// ── Simplified Chinese ────────────────────────────────────────────────────────

const ZH_CN: TutorialStepTranslations = {
  // welcome (2 steps)
  welcome_0: {
    text: '欢迎来到《Waifu Clone Wars》，克隆体。',
    subtext:
      '你被 Znyxorga 帝国绑架，并被投入他们的跨维度角斗场赛事。本教程将教会你生存所需的一切，大约需要 5 分钟。',
  },
  welcome_1: {
    text: '你的第一个任务——在训练对决中存活。',
    subtext:
      '你将与一个被削弱的敌人战斗，学习移动和战斗的基础知识。点击第一个节点开始。',
  },

  // s1_battle (5 steps)
  s1_battle_0: {
    text: '这是 Leonidas，她是你的第一位战士。',
    subtext:
      '每个角色都有 HP（生命值）、力量（近战伤害）、能量（卡牌伤害）、防御（伤害减免）和移动范围。请查看左侧的属性面板。',
  },
  s1_battle_1: {
    text: '将 Leonidas 移向敌人。',
    subtext:
      '点击 Leonidas 选中她，然后点击发光的绿色格子进行移动。绿色 = 有效移动格。',
  },
  s1_battle_2: {
    text: '现在攻击——对敌人使用基础攻击。',
    subtext: '点击"基础攻击"卡牌，然后点击敌人进行攻击。',
  },
  s1_battle_3: {
    text: '打得好！点击结束回合。',
    subtext: '敌人行动后，你将抽取新卡牌并再次行动。',
  },
  s1_battle_4: {
    text: '把它消灭！',
    subtext: '你有两张基础攻击——一张就够了。对敌人使用它来获得胜利。',
  },

  // s2_battle (3 steps)
  s2_battle_0: {
    text: '这次有两个敌人。我们来了解一下法力值。',
    subtext:
      '每回合开始时你拥有 5 点法力值。不同卡牌消耗不同法力值。回合结束时未使用的法力值将消失。',
  },
  s2_battle_1: {
    text: '打出"举盾"来提升你的防御。',
    subtext:
      '点击"举盾"，使防御在下一回合前提升 +10，然后点击结束回合。',
  },
  s2_battle_2: {
    text: '击败所有敌人！',
    subtext: '本回合你有两张基础攻击——用它们对付敌人。',
  },

  // s3_map (4 steps)
  s3_map_0: {
    text: '你获得了卡牌奖励——选择一张！',
    subtext:
      '这张卡牌将陪伴你度过本次旅程的剩余部分，永久加入你的牌组。选择最符合你策略的那张。',
  },
  s3_map_1: {
    text: '这是竞技场巡回赛地图。',
    subtext:
      '战斗间隙，你将沿着分支路径前行。每个节点提供不同内容。你选择自己的路线——每次旅程都与众不同。',
  },
  s3_map_2: {
    text: '⚔️ 战斗  ·  💀 精英  ·  🏪 商店  ·  🛏️ 休息  ·  👑 首领',
    subtext:
      '战斗 = 普通战斗 · 精英 = 更难的战斗，更好的战利品 · 商店 = 花费金币 · 休息 = 恢复 HP 或强化卡牌 · 首领 = 幕章结束。',
  },
  s3_map_3: {
    text: '点击下一个战斗节点继续。',
    subtext:
      '在真实的旅程中，路径会在战斗、休息节点、商店和精英之间分叉。现在请点击战斗节点继续前进。',
  },

  // s4_battle (3 steps)
  s4_battle_0: {
    text: 'Napoleon 加入了你的队伍！',
    subtext:
      '你现在控制两名战士。两人每回合各自行动——你决定顺序。每人拥有自己的卡牌，但共享同一个法力值池。',
  },
  s4_battle_1: {
    text: '使用顶部的当前单位栏来切换战士。',
    subtext:
      '点击栏中的头像来切换控制对象，或直接点击棋盘上的图标。两名角色都完成行动后才能结束回合。',
  },
  s4_battle_2: {
    text: '同时使用两个角色——每人都有一张基础攻击卡。',
    subtext:
      '选择 Leonidas，使用她的基础攻击。然后切换到 Napoleon，使用他的基础攻击。两人联手可以击败任何敌人。',
  },

  // s5_boss (2 steps)
  s5_boss_0: {
    text: '最终考验——一位 Krath 冠军挡在你面前。',
    subtext:
      '像之前一样同时使用两名战士。这位冠军为训练而被削弱——真正的冠军可不会如此。',
  },
  s5_boss_1: {
    text: '击败冠军，完成教程！',
    subtext: '每名战士都有一张基础攻击。两次命中，冠军就会倒下。',
  },

  // s3b_campfire (2 steps)
  s3b_campfire_0: {
    text: '这是休息节点——你的恢复地点。',
    subtext:
      '为所有角色恢复最大 HP 的 30%，或将你牌组中的一张卡牌升级为更强大的版本。休息节点是你在战斗间隙的主要治疗手段。',
  },
  s3b_campfire_1: {
    text: '恢复状态后前往下一场战斗。',
    subtext:
      'Napoleon 将在下一场战斗中与你并肩作战——做好准备。准备好后离开即可。',
  },
};

// ── Lookup table ──────────────────────────────────────────────────────────────

const TUTORIAL_STEP_I18N: Partial<Record<Language, TutorialStepTranslations>> = {
  de:      DE,
  ko:      KO,
  'pt-BR': PT_BR,
  'zh-CN': ZH_CN,
};

/**
 * Returns the translated text/subtext for a tutorial step, or null if the
 * active language is English (en) or no translation exists for this key.
 */
export function getTutorialStepTranslation(
  stage: TutorialStage,
  stepIndex: number,
  lang: Language,
): TutorialStepTranslation | null {
  return TUTORIAL_STEP_I18N[lang]?.[`${stage}_${stepIndex}`] ?? null;
}
