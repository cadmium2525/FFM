import { equipmentBySlot, selectableAbilities, crystalShards } from '../database/ff5Database.js';
import {
  calculateEquipmentBonuses,
  equipmentDetailText,
  equipmentEffectText,
  findEquipment,
} from '../battle/EquipmentSystem.js';
import { isAbilityImplemented } from '../data/abilityData.js';
import { saveUnitLoadout } from '../core/Loadout.js';
import { getAbilityListPosition, saveAbilityListPosition } from '../core/AbilityPosition.js';
import { resolveDiscTechniqueIds } from '../data/discStones.js';

const slotLabels = {
  weapon: '武器',
  shield: '盾',
  head: '頭',
  body: '体',
  accessory: 'アクセサリ',
};

const jobLabels = {
  knight: 'ナイト', monk: 'モンク', thief: 'シーフ', blue_mage: '青魔道士',
  white_mage: '白魔道士', black_mage: '黒魔道士', mystic_knight: '魔法剣士',
  berserker: 'バーサーカー', summoner: '召喚士', time_mage: '時魔道士',
  red_mage: '赤魔道士', beastmaster: '魔獣使い', geomancer: '風水士',
  ninja: '忍者', ranger: '狩人', bard: '吟遊詩人', samurai: '侍',
  dancer: '踊り子', dragoon: '竜騎士', chemist: '薬師', mime: 'ものまね士',
};

function equipmentStatLine(item) {
  if (!item) return '';
  return item.slot === 'weapon'
    ? `攻撃力 ${item.attack} ／ 命中 ${item.accuracy ?? '-'}%`
    : `防御 ${item.defense} ／ 魔防 ${item.magicDefense} ／ 回避 ${item.evasion}%`;
}

/**
 * Party formation screen shown between bosses. One character occupies the
 * whole screen at a time (bigger text, easier to read on mobile); use the
 * prev/next arrow buttons to page between party members. Equipment/ability/
 * crystal-shard choices are made via a full-detail picker modal (name + stat
 * gains + additional effect for every option) rather than a plain <select>,
 * and are persisted to localStorage via Loadout.js as soon as they change,
 * so the player doesn't have to re-pick them on every run.
 */
export class IntermissionUI {
  constructor() {
    this.containerEl = document.getElementById('intermission-party');
    this.nextBossLabelEl = document.getElementById('next-boss-label');
    this.prevButton = document.getElementById('intermission-prev');
    this.nextButton = document.getElementById('intermission-next');
    this.indicatorEl = document.getElementById('intermission-indicator');
    this.partyUnits = [];
    this.ownedDiscs = [];
    this.currentIndex = 0;
    this.activePickerPosition = null;

    this.prevButton?.addEventListener('click', () => this.step(-1));
    this.nextButton?.addEventListener('click', () => this.step(1));

    this.buildPickerModal();
  }

  buildPickerModal() {
    const overlay = document.createElement('div');
    overlay.className = 'picker-overlay hidden';

    const modal = document.createElement('div');
    modal.className = 'ff5-window picker-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');

    const header = document.createElement('div');
    header.className = 'picker-modal-header';
    const title = document.createElement('div');
    title.className = 'picker-modal-title';
    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.className = 'picker-modal-close';
    closeButton.setAttribute('aria-label', '閉じる');
    closeButton.textContent = '×';
    header.append(title, closeButton);

    const list = document.createElement('div');
    list.className = 'picker-modal-list';

    modal.append(header, list);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    const close = () => {
      this.rememberPickerPosition();
      overlay.classList.add('hidden');
      this.activePickerPosition = null;
    };
    closeButton.addEventListener('click', close);
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) close();
    });

    this.pickerEl = overlay;
    this.pickerTitleEl = title;
    this.pickerListEl = list;
    list.addEventListener('scroll', () => this.rememberPickerPosition(), { passive: true });
  }

  /**
   * options: array of { value, name, statLine, effectText, selected, disabled, badge }
   */
  openPicker(titleText, options, onSelect, position = null) {
    this.rememberPickerPosition();
    this.activePickerPosition = position;
    this.pickerTitleEl.textContent = titleText;
    this.pickerListEl.innerHTML = '';

    options.forEach((opt) => {
      const row = document.createElement('button');
      row.type = 'button';
      row.className = 'picker-row';
      if (opt.selected) row.classList.add('selected');
      if (opt.disabled) row.classList.add('disabled');
      row.disabled = !!opt.disabled;

      const rowTop = document.createElement('div');
      rowTop.className = 'picker-row-top';
      const name = document.createElement('span');
      name.className = 'picker-row-name';
      name.textContent = opt.name;
      rowTop.appendChild(name);
      if (opt.badge) {
        const badge = document.createElement('span');
        badge.className = 'picker-row-badge';
        badge.textContent = opt.badge;
        rowTop.appendChild(badge);
      }
      row.appendChild(rowTop);

      if (opt.statLine) {
        const stat = document.createElement('div');
        stat.className = 'picker-row-stat';
        stat.textContent = opt.statLine;
        row.appendChild(stat);
      }

      if (opt.effectText) {
        const effect = document.createElement('div');
        effect.className = 'picker-row-effect';
        effect.textContent = `追加効果: ${opt.effectText}`;
        row.appendChild(effect);
      }

      row.addEventListener('click', () => {
        if (opt.disabled) return;
        this.rememberPickerPosition();
        onSelect(opt.value);
        this.pickerEl.classList.add('hidden');
        this.activePickerPosition = null;
      });

      this.pickerListEl.appendChild(row);
    });

    this.pickerEl.classList.remove('hidden');
    requestAnimationFrame(() => {
      this.pickerListEl.scrollTop = position
        ? getAbilityListPosition(position.unitId, position.surface, position.abilityId)
        : 0;
    });
  }

  rememberPickerPosition() {
    if (!this.activePickerPosition || !this.pickerListEl) return;
    const { unitId, surface, abilityId } = this.activePickerPosition;
    saveAbilityListPosition(unitId, surface, this.pickerListEl.scrollTop, abilityId);
  }

  clear() {
    this.rememberPickerPosition();
    this.containerEl.replaceChildren();
    this.nextBossLabelEl.textContent = '';
    if (this.indicatorEl) this.indicatorEl.textContent = '';
    this.partyUnits = [];
    this.pickerEl?.classList.add('hidden');
    this.activePickerPosition = null;
  }

  step(direction) {
    if (this.partyUnits.length < 2) return;
    this.currentIndex = (this.currentIndex + direction + this.partyUnits.length) % this.partyUnits.length;
    this.renderCurrentCard();
  }

  render(partyUnits, nextBoss, ownedDiscs = []) {
    this.partyUnits = partyUnits;
    this.ownedDiscs = ownedDiscs;
    this.currentIndex = 0;
    this.nextBossLabelEl.textContent = nextBoss
      ? `つぎのボス: ${nextBoss.name}`
      : '';

    const showNav = partyUnits.length > 1;
    this.prevButton?.classList.toggle('hidden', !showNav);
    this.nextButton?.classList.toggle('hidden', !showNav);

    this.renderCurrentCard();
  }

  renderCurrentCard() {
    const unit = this.partyUnits[this.currentIndex];
    this.containerEl.innerHTML = '';
    this.pickerEl?.classList.add('hidden');
    this.activePickerPosition = null;
    if (!unit) return;

    if (this.indicatorEl) {
      this.indicatorEl.textContent = `${this.currentIndex + 1} / ${this.partyUnits.length}　${unit.name}`;
    }

    const card = document.createElement('div');
    card.className = 'ff5-window intermission-card';

    const portrait = document.createElement('div');
    portrait.className = 'intermission-portrait';

    const spriteSlot = document.createElement('div');
    spriteSlot.className = 'sprite-slot';
    const sprite = document.createElement('div');
    sprite.className = `sprite-placeholder player unit-${unit.id ?? ''}`;
    sprite.style.width = '100%';
    sprite.style.height = '100%';
    if (unit.spriteUrl) {
      sprite.classList.add('has-sprite-image');
      const img = document.createElement('img');
      img.className = 'sprite-image';
      img.src = unit.spriteUrl;
      img.alt = unit.name;
      img.draggable = false;
      sprite.appendChild(img);
    } else {
      const blob = document.createElement('div');
      blob.className = 'blob';
      blob.style.width = '100%';
      blob.style.height = '100%';
      blob.innerHTML = `<span class="soul-flare"></span><span class="soul-core"></span><span class="soul-rune">${unit.name ? unit.name.charAt(0) : ''}</span>`;
      sprite.appendChild(blob);
    }
    spriteSlot.appendChild(sprite);
    portrait.appendChild(spriteSlot);

    const headline = document.createElement('div');
    headline.className = 'intermission-headline';

    const nameEl = document.createElement('div');
    nameEl.className = 'card-name';
    nameEl.textContent = unit.name;
    headline.appendChild(nameEl);

    const statsEl = document.createElement('div');
    statsEl.className = 'card-stats';
    statsEl.innerHTML = `HP ${unit.hp}/${unit.maxHp}　MP ${unit.mp}/${unit.maxMp}<br>ATK ${unit.atk}　MAG ${unit.magic}　AGI ${unit.agility}`;
    headline.appendChild(statsEl);

    portrait.appendChild(headline);
    card.appendChild(portrait);

    const info = document.createElement('div');
    info.className = 'intermission-card-info';

    const selects = document.createElement('div');
    selects.className = 'formation-selects';

    const detail = document.createElement('div');
    detail.className = 'formation-detail';
    detail.setAttribute('role', 'status');

    const persistLoadout = () => {
      saveUnitLoadout(unit.id, {
        equipment: unit.equipment,
        abilityId: unit.abilityId,
        crystalShardId: unit.crystalShardId,
      });
    };

    const updateDetails = () => {
      const bonuses = calculateEquipmentBonuses(unit.equipment);
      const ability = selectableAbilities.find((entry) => entry.id === unit.abilityId);
      const equipmentLines = Object.entries(slotLabels).map(([slot, label]) => {
        const item = findEquipment(unit.equipment?.[slot]);
        return `${label}: ${item?.nameJa ?? 'なし'} — ${equipmentDetailText(item)}`;
      });
      const abilityLine = ability
        ? `アビリティ: ${ability.nameJa} — ${ability.effect}［${isAbilityImplemented(ability.id) ? '戦闘反映' : '準備中'}］`
        : 'アビリティ: なし';
      const discTechniqueIds = resolveDiscTechniqueIds(unit.crystalShardId, this.ownedDiscs);
      const discTechniqueNames = discTechniqueIds
        .map((id) => crystalShards.find((entry) => entry.id === id)?.techniqueNameJa)
        .filter(Boolean);
      const discLine = discTechniqueNames.length
        ? `えんばんせきの技: ${discTechniqueNames.join('・')}`
        : 'えんばんせきの技: なし';
      detail.textContent = [
        `戦闘能力: 攻撃 ${unit.baseAtk + bonuses.attack} / 防御 ${unit.baseDef + bonuses.defense} / 魔防 ${unit.baseMagicDef + bonuses.magicDefense} / 魔力 ${unit.baseMagic + bonuses.magic} / 素早さ ${unit.baseAgility + bonuses.agility} / 回避 ${bonuses.evasion}%`,
        ...equipmentLines,
        abilityLine,
        discLine,
      ].join('\n');
    };

    // ---- Equipment slots (weapon / shield / head / body / accessory) ----
    Object.entries(slotLabels).forEach(([slot, labelText]) => {
      const field = document.createElement('div');
      field.className = 'formation-field';
      const caption = document.createElement('span');
      caption.textContent = labelText;

      const picker = document.createElement('button');
      picker.type = 'button';
      picker.className = 'picker-trigger';
      picker.setAttribute('aria-haspopup', 'dialog');

      const renderPickerLabel = () => {
        const current = findEquipment(unit.equipment?.[slot]);
        picker.textContent = current ? current.nameJa : 'なし';
      };
      renderPickerLabel();

      picker.addEventListener('click', () => {
        const options = [
          {
            value: '',
            name: 'なし',
            statLine: '',
            effectText: '',
            selected: !unit.equipment?.[slot],
          },
          ...equipmentBySlot[slot].map((item) => ({
            value: item.id,
            name: item.nameJa,
            statLine: equipmentStatLine(item),
            effectText: equipmentEffectText(item),
            selected: unit.equipment?.[slot] === item.id,
            badge: item.special ? '★' : null,
          })),
        ];
        this.openPicker(`${unit.name}の${labelText}を選択`, options, (value) => {
          unit.equipment = { ...unit.equipment, [slot]: value || null };
          if (slot === 'weapon') unit.weaponId = value || null;
          renderPickerLabel();
          updateDetails();
          persistLoadout();
        });
      });

      field.append(caption, picker);
      selects.appendChild(field);
    });

    // ---- Ability slot ----
    const abilityField = document.createElement('div');
    abilityField.className = 'formation-field';
    const abilityCaption = document.createElement('span');
    abilityCaption.textContent = 'アビリティ';
    const abilityPicker = document.createElement('button');
    abilityPicker.type = 'button';
    abilityPicker.className = 'picker-trigger';
    abilityPicker.setAttribute('aria-haspopup', 'dialog');

    const renderAbilityLabel = () => {
      const current = selectableAbilities.find((entry) => entry.id === unit.abilityId);
      abilityPicker.textContent = current ? current.nameJa : 'なし';
    };
    renderAbilityLabel();

    abilityPicker.addEventListener('click', () => {
      const options = selectableAbilities.map((ability) => ({
        value: ability.id,
        name: `${ability.nameJa}（${jobLabels[ability.job] ?? ability.job}）`,
        statLine: '',
        effectText: ability.effect,
        selected: unit.abilityId === ability.id,
        disabled: !isAbilityImplemented(ability.id),
        badge: isAbilityImplemented(ability.id) ? null : '準備中',
      }));
      this.openPicker(`${unit.name}のアビリティを選択`, options, (value) => {
        unit.abilityId = value;
        renderAbilityLabel();
        updateDetails();
        persistLoadout();
      }, { unitId: unit.id, surface: 'formation' });
    });

    abilityField.append(abilityCaption, abilityPicker);
    selects.appendChild(abilityField);

    // ---- えんばんせき slot ----
    const shardField = document.createElement('div');
    shardField.className = 'formation-field';
    const shardCaption = document.createElement('span');
    shardCaption.textContent = 'えんばんせき';
    const shardPicker = document.createElement('button');
    shardPicker.type = 'button';
    shardPicker.className = 'picker-trigger';
    shardPicker.setAttribute('aria-haspopup', 'dialog');

    const findEquippedDisc = () =>
      this.ownedDiscs.find((entry) => entry.uid === unit.crystalShardId)
      ?? crystalShards.find((entry) => entry.id === unit.crystalShardId);

    const renderShardLabel = () => {
      const current = findEquippedDisc();
      shardPicker.textContent = current ? (current.name ?? current.nameJa) : 'なし';
    };
    renderShardLabel();

    shardPicker.addEventListener('click', () => {
      const options = [
        ...this.ownedDiscs.map((disc) => ({
          value: disc.uid,
          name: disc.name,
          statLine: `技(${disc.shardIds.length}/4): ${disc.shardIds
            .map((id) => crystalShards.find((entry) => entry.id === id)?.techniqueNameJa ?? id)
            .join('・')}`,
          effectText: '',
          selected: unit.crystalShardId === disc.uid,
          badge: disc.shardIds.length > 1 ? '融合' : null,
        })),
        ...crystalShards.map((shard) => ({
          value: shard.id,
          name: shard.nameJa,
          statLine: `技: ${shard.techniqueNameJa}`,
          effectText: shard.lore,
          selected: unit.crystalShardId === shard.id,
        })),
      ];
      this.openPicker(`${unit.name}のえんばんせきを選択`, options, (value) => {
        unit.crystalShardId = value;
        unit.crystalShardTechniqueIds = resolveDiscTechniqueIds(value, this.ownedDiscs);
        renderShardLabel();
        updateDetails();
        persistLoadout();
      });
    });

    shardField.append(shardCaption, shardPicker);
    selects.appendChild(shardField);

    info.appendChild(selects);

    updateDetails();
    info.appendChild(detail);

    const note = document.createElement('small');
    note.className = 'formation-note';
    note.textContent = '★は追加効果あり。装備の能力値・属性と「戦闘反映」表示のアビリティは次のバトルから有効です。設定は端末に保存され、次回以降も自動的に反映されます。';
    info.appendChild(note);

    card.appendChild(info);
    this.containerEl.appendChild(card);
  }
}
