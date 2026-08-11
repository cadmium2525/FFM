import { eventBus } from '../core/EventBus.js';
import { basicCommands, attackAction, defendAction, itemActions, magicSets } from '../data/abilityData.js';
import { elementNames } from '../data/bossData.js';
import { MessageWindow } from './MessageWindow.js';

function hpBarClass(unit) {
  const ratio = unit.hpRatio();
  if (ratio <= 0.25) return 'low';
  if (ratio <= 0.5) return 'mid';
  return '';
}

export class BattleUI {
  constructor() {
    this.enemyFieldEl = document.getElementById('enemy-field');
    this.partyFieldEl = document.getElementById('party-field');
    this.ctbListEl = document.getElementById('ctb-list');
    this.enemyInfoEl = document.getElementById('enemy-info-content');
    this.commandListEl = document.getElementById('command-list');
    this.commandHeadingEl = document.getElementById('command-heading');
    this.partyStatusEl = document.getElementById('party-status-content');

    this.submenuWindowEl = document.getElementById('submenu-window');
    this.submenuHeadingEl = document.getElementById('submenu-heading');
    this.submenuListEl = document.getElementById('submenu-list');

    this.targetWindowEl = document.getElementById('target-window');
    this.targetListEl = document.getElementById('target-list');

    this.messageWindow = new MessageWindow(
      document.getElementById('message-window'),
      document.getElementById('message-text')
    );

    this.battleManager = null;
    this.pendingCommandType = null; // 'attack' | 'magic' | 'item' | 'defend'
    this.pendingSpellOrItem = null;

    this._bindStaticEvents();
  }

  attachBattle(battleManager) {
    this.battleManager = battleManager;
    this.closeSubmenu();
    this.closeTargetWindow();
    this.renderCommandListIdle();
  }

  _bindStaticEvents() {
    eventBus.on('battle:log', (text) => this.messageWindow.show(text));

    eventBus.on('battle:stateUpdate', ({ party, boss, preview }) => {
      this.renderEnemyField(boss);
      this.renderPartyField(party, this.battleManager?.currentActor);
      this.renderCtbList(preview);
      this.renderEnemyInfo(boss);
      this.renderPartyStatus(party);
    });

    eventBus.on('battle:playerTurn', ({ actor }) => {
      this.renderCommandListForActor(actor);
    });

    eventBus.on('battle:actionResolved', ({ results }) => {
      results.forEach((r) => {
        const el = document.querySelector(`[data-uid="${r.targetUid}"]`);
        if (el) {
          el.classList.add('flash');
          setTimeout(() => el.classList.remove('flash'), 500);
        }
      });
    });
  }

  // ---------- Rendering ----------

  renderEnemyField(boss) {
    this.enemyFieldEl.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.className = 'enemy-sprite-wrap';

    const sprite = document.createElement('div');
    sprite.className = `sprite-placeholder boss${boss.isAlive() ? '' : ' dead'}`;
    sprite.dataset.uid = boss.uid;
    const scale = Math.min(220, 185 * (boss.size ?? 1));
    sprite.style.width = `${scale}px`;
    sprite.style.height = `${scale}px`;

    const blob = document.createElement('div');
    blob.className = 'blob';
    blob.style.width = '100%';
    blob.style.height = '100%';
    sprite.appendChild(blob);

    const label = document.createElement('div');
    label.className = 'label';
    label.textContent = boss.name;
    sprite.appendChild(label);

    wrap.appendChild(sprite);
    this.enemyFieldEl.appendChild(wrap);
  }

  renderPartyField(party, currentActor) {
    this.partyFieldEl.innerHTML = '';
    party.forEach((unit, idx) => {
      const row = document.createElement('div');
      row.className = 'party-unit-row';

      const spriteSlot = document.createElement('div');
      spriteSlot.className = 'sprite-slot';
      const sprite = document.createElement('div');
      sprite.className = `sprite-placeholder player${unit.isAlive() ? '' : ' dead'}`;
      sprite.dataset.uid = unit.uid;
      sprite.style.width = '100%';
      sprite.style.height = '100%';
      const blob = document.createElement('div');
      blob.className = 'blob';
      blob.style.width = '100%';
      blob.style.height = '100%';
      sprite.appendChild(blob);
      spriteSlot.appendChild(sprite);
      row.appendChild(spriteSlot);

      const meta = document.createElement('div');
      meta.className = 'unit-meta';

      const nameLine = document.createElement('div');
      nameLine.className = 'unit-name-line' + (currentActor === unit ? ' active-turn' : '');
      nameLine.innerHTML = `<span>P${idx + 1}: ${unit.name}</span>`;
      meta.appendChild(nameLine);

      const roleLine = document.createElement('div');
      roleLine.className = 'unit-role';
      roleLine.textContent = unit.role ?? '';
      meta.appendChild(roleLine);

      const barTrack = document.createElement('div');
      barTrack.className = 'stat-bar-track';
      const barFill = document.createElement('div');
      barFill.className = `stat-bar-fill hp ${hpBarClass(unit)}`;
      barFill.style.width = `${Math.max(0, unit.hpRatio() * 100)}%`;
      barTrack.appendChild(barFill);
      meta.appendChild(barTrack);

      row.appendChild(meta);
      this.partyFieldEl.appendChild(row);
    });
  }

  renderCtbList(preview) {
    this.ctbListEl.innerHTML = '';
    preview.forEach((entry) => {
      const row = document.createElement('div');
      row.className = 'ctb-entry';
      const icon = document.createElement('div');
      icon.className = `ctb-icon ${entry.isEnemy ? 'enemy' : 'player'}`;
      const label = document.createElement('div');
      label.className = 'ctb-label';
      label.textContent = entry.name;
      row.appendChild(icon);
      row.appendChild(label);
      this.ctbListEl.appendChild(row);
    });
  }

  renderEnemyInfo(boss) {
    const weakText = boss.weakness ? (elementNames[boss.weakness] ?? boss.weakness) : '不明';
    this.enemyInfoEl.innerHTML = `
      <div>${boss.name}</div>
      <div>HP: ${boss.hp} / ${boss.maxHp}</div>
      <div class="stat-bar-track"><div class="stat-bar-fill hp ${hpBarClass(boss)}" style="width:${Math.max(0, boss.hpRatio() * 100)}%"></div></div>
      <div>弱点: ${weakText}</div>
    `;
  }

  renderPartyStatus(party) {
    this.partyStatusEl.innerHTML = '';
    party.forEach((unit, idx) => {
      const row = document.createElement('div');
      row.className = 'status-row';
      row.innerHTML = `
        <div class="p-name">${unit.name}</div>
        <div class="p-nums">
          <span>HP ${unit.hp}/${unit.maxHp}</span>
          <div class="stat-bar-track"><div class="stat-bar-fill hp ${hpBarClass(unit)}" style="width:${Math.max(0, unit.hpRatio() * 100)}%"></div></div>
        </div>
        <div class="p-nums">
          <span>MP ${unit.mp}/${unit.maxMp}</span>
          <div class="stat-bar-track"><div class="stat-bar-fill mp" style="width:${unit.maxMp ? (unit.mp / unit.maxMp) * 100 : 0}%"></div></div>
        </div>
      `;
      this.partyStatusEl.appendChild(row);
    });
  }

  renderCommandListIdle() {
    this.commandHeadingEl.textContent = 'コマンド';
    this.commandListEl.innerHTML = '<li style="opacity:.6">・・・待機中・・・</li>';
  }

  renderCommandListForActor(actor) {
    this.commandHeadingEl.textContent = actor.name;
    this.commandListEl.innerHTML = '';
    basicCommands.forEach((cmd) => {
      const li = document.createElement('li');
      li.textContent = cmd.label;
      li.addEventListener('click', () => this.handleCommandSelect(cmd.id, actor));
      this.commandListEl.appendChild(li);
    });
  }

  // ---------- Player input flow ----------

  handleCommandSelect(commandId, actor) {
    switch (commandId) {
      case 'attack':
        this.submitAttack(actor);
        break;
      case 'defend':
        this.submitDefend(actor);
        break;
      case 'magic':
      case 'ability': {
        const setName = actor.equippedAbilitySet ?? 'たたかう型';
        const list = magicSets[setName] ?? [];
        this.openSubmenu(commandId === 'magic' ? 'まほう' : 'アビリティ', list, 'spell', actor);
        break;
      }
      case 'item':
        this.openSubmenu('アイテム', itemActions, 'item', actor);
        break;
      default:
        break;
    }
  }

  submitAttack(actor) {
    this.battleManager.submitPlayerAction({ type: 'attack', ctbCost: attackAction.ctbCost }, this.battleManager.boss);
  }

  submitDefend(actor) {
    this.battleManager.submitPlayerAction({ type: 'defend', ctbCost: defendAction.ctbCost }, actor);
  }

  openSubmenu(heading, list, kind, actor) {
    this.submenuHeadingEl.textContent = heading;
    this.submenuListEl.innerHTML = '';

    if (list.length === 0) {
      const li = document.createElement('li');
      li.textContent = '(つかえるものがない)';
      this.submenuListEl.appendChild(li);
    }

    list.forEach((entry) => {
      const li = document.createElement('li');
      const costLabel = entry.mpCost ? ` (MP${entry.mpCost})` : '';
      li.textContent = `${entry.name}${costLabel}`;
      const disabled = kind === 'spell' && entry.mpCost && actor.mp < entry.mpCost;
      if (disabled) {
        li.style.opacity = '0.4';
        li.style.cursor = 'not-allowed';
      } else {
        li.addEventListener('click', () => {
          this.closeSubmenu();
          this.pendingCommandType = kind;
          this.pendingSpellOrItem = entry;
          this.promptTarget(entry, kind, actor);
        });
      }
      this.submenuListEl.appendChild(li);
    });

    // cancel option
    const cancel = document.createElement('li');
    cancel.textContent = 'もどる';
    cancel.style.color = '#ffcf7a';
    cancel.addEventListener('click', () => this.closeSubmenu());
    this.submenuListEl.appendChild(cancel);

    this.submenuWindowEl.classList.remove('hidden');
  }

  closeSubmenu() {
    this.submenuWindowEl.classList.add('hidden');
  }

  promptTarget(entry, kind, actor) {
    const isHeal = entry.healAmount !== undefined;
    const targets = isHeal ? this.battleManager.party.filter((p) => p.isAlive()) : [this.battleManager.boss];

    if (targets.length === 1) {
      this.finalizeAction(entry, kind, targets[0]);
      return;
    }

    this.targetListEl.innerHTML = '';
    targets.forEach((t) => {
      const li = document.createElement('li');
      li.textContent = `${t.name} (HP ${t.hp}/${t.maxHp})`;
      li.addEventListener('click', () => {
        this.closeTargetWindow();
        this.finalizeAction(entry, kind, t);
      });
      this.targetListEl.appendChild(li);
    });
    this.targetWindowEl.classList.remove('hidden');
  }

  closeTargetWindow() {
    this.targetWindowEl.classList.add('hidden');
  }

  finalizeAction(entry, kind, target) {
    if (kind === 'spell') {
      this.battleManager.submitPlayerAction({ type: 'magic', spell: entry, ctbCost: entry.ctbCost }, target);
    } else if (kind === 'item') {
      this.battleManager.submitPlayerAction({ type: 'item', item: entry, ctbCost: entry.ctbCost }, target);
    }
  }
}
