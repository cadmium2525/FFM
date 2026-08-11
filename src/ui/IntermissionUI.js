import { equipmentBySlot, selectableAbilities, crystalShards } from '../database/ff5Database.js';
import { calculateEquipmentBonuses, equipmentDetailText, findEquipment } from '../battle/EquipmentSystem.js';
import { isAbilityImplemented } from '../data/abilityData.js';

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

export class IntermissionUI {
  constructor() {
    this.containerEl = document.getElementById('intermission-party');
    this.nextBossLabelEl = document.getElementById('next-boss-label');
  }

  render(partyUnits, nextBoss) {
    this.nextBossLabelEl.textContent = nextBoss
      ? `つぎのボス: ${nextBoss.name} （弱点: ${nextBoss.weakness ?? '不明'}）`
      : '';

    this.containerEl.innerHTML = '';
    partyUnits.forEach((unit) => {
      const card = document.createElement('div');
      card.className = 'ff5-window intermission-card';

      const spriteSlot = document.createElement('div');
      spriteSlot.className = 'sprite-slot';
      spriteSlot.style.width = '48px';
      spriteSlot.style.height = '48px';
      const sprite = document.createElement('div');
      sprite.className = 'sprite-placeholder player';
      sprite.style.width = '100%';
      sprite.style.height = '100%';
      const blob = document.createElement('div');
      blob.className = 'blob';
      blob.style.width = '100%';
      blob.style.height = '100%';
      sprite.appendChild(blob);
      spriteSlot.appendChild(sprite);
      card.appendChild(spriteSlot);

      const info = document.createElement('div');
      info.style.flex = '1';

      const nameEl = document.createElement('div');
      nameEl.className = 'card-name';
      nameEl.textContent = unit.name;
      info.appendChild(nameEl);

      const statsEl = document.createElement('div');
      statsEl.className = 'card-stats';
      statsEl.innerHTML = `HP ${unit.hp}/${unit.maxHp}　MP ${unit.mp}/${unit.maxMp}<br>ATK ${unit.atk}　MAG ${unit.magic}　AGI ${unit.agility}`;
      info.appendChild(statsEl);

      const selects = document.createElement('div');
      selects.className = 'formation-selects';

      const detail = document.createElement('div');
      detail.className = 'formation-detail';
      detail.setAttribute('role', 'status');

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
        detail.textContent = [
          `戦闘能力: 攻撃 ${unit.baseAtk + bonuses.attack} / 防御 ${unit.baseDef + bonuses.defense} / 魔防 ${unit.baseMagicDef + bonuses.magicDefense} / 魔力 ${unit.baseMagic + bonuses.magic} / 素早さ ${unit.baseAgility + bonuses.agility} / 回避 ${bonuses.evasion}%`,
          ...equipmentLines,
          abilityLine,
        ].join('\n');
      };

      Object.entries(slotLabels).forEach(([slot, labelText]) => {
        const label = document.createElement('label');
        label.className = 'formation-field';
        const caption = document.createElement('span');
        caption.textContent = labelText;
        const select = document.createElement('select');
        select.setAttribute('aria-label', `${unit.name}の${labelText}`);

        const none = document.createElement('option');
        none.value = '';
        none.textContent = 'なし';
        select.appendChild(none);

        equipmentBySlot[slot].forEach((item) => {
          const option = document.createElement('option');
          option.value = item.id;
          const stat = slot === 'weapon'
            ? `攻${item.attack} 命中${item.accuracy ?? '-'}%`
            : `防${item.defense} 魔防${item.magicDefense} 回避${item.evasion}%`;
          option.textContent = `${item.nameJa}　${stat}${item.special ? ' ★' : ''}`;
          option.selected = unit.equipment?.[slot] === item.id;
          select.appendChild(option);
        });

        select.addEventListener('change', () => {
          unit.equipment = { ...unit.equipment, [slot]: select.value || null };
          if (slot === 'weapon') unit.weaponId = select.value || null;
          updateDetails();
        });
        label.append(caption, select);
        selects.appendChild(label);
      });

      const abilityLabel = document.createElement('label');
      abilityLabel.className = 'formation-field';
      const abilityCaption = document.createElement('span');
      abilityCaption.textContent = 'アビリティ';
      const abilitySelect = document.createElement('select');
      abilitySelect.setAttribute('aria-label', `${unit.name}のアビリティ`);
      const abilitiesByJob = Object.groupBy
        ? Object.groupBy(selectableAbilities, (ability) => ability.job)
        : selectableAbilities.reduce((groups, ability) => {
            (groups[ability.job] ??= []).push(ability);
            return groups;
          }, {});
      Object.entries(abilitiesByJob).forEach(([job, abilities]) => {
        const group = document.createElement('optgroup');
        group.label = jobLabels[job] ?? job;
        abilities.forEach((ability) => {
          const option = document.createElement('option');
          option.value = ability.id;
          option.textContent = ability.nameJa;
          option.selected = unit.abilityId === ability.id;
          option.disabled = !isAbilityImplemented(ability.id);
          if (option.disabled) option.textContent += '（準備中）';
          group.appendChild(option);
        });
        abilitySelect.appendChild(group);
      });
      abilitySelect.addEventListener('change', () => {
        unit.abilityId = abilitySelect.value;
        updateDetails();
      });
      abilityLabel.append(abilityCaption, abilitySelect);
      selects.appendChild(abilityLabel);

      const shardLabel = document.createElement('label');
      shardLabel.className = 'formation-field';
      const shardCaption = document.createElement('span');
      shardCaption.textContent = 'クリスタルのかけら';
      const shardSelect = document.createElement('select');
      shardSelect.setAttribute('aria-label', `${unit.name}のクリスタルのかけら`);
      crystalShards.forEach((shard) => {
        const option = document.createElement('option');
        option.value = shard.id;
        option.textContent = `${shard.nameJa}（${shard.techniqueNameJa}）`;
        option.selected = unit.crystalShardId === shard.id;
        shardSelect.appendChild(option);
      });
      shardSelect.addEventListener('change', () => { unit.crystalShardId = shardSelect.value; });
      shardLabel.append(shardCaption, shardSelect);
      selects.appendChild(shardLabel);

      info.appendChild(selects);

      updateDetails();
      info.appendChild(detail);

      const note = document.createElement('small');
      note.className = 'formation-note';
      note.textContent = '★は追加効果あり。装備の能力値・属性と「戦闘反映」表示のアビリティは次のバトルから有効です。';
      info.appendChild(note);
      card.appendChild(info);
      this.containerEl.appendChild(card);
    });
  }
}
