import { equipmentBySlot, selectableAbilities, crystalShards } from '../database/ff5Database.js';

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
          const stat = slot === 'weapon' ? `攻${item.attack}` : `防${item.defense}`;
          option.textContent = `${item.nameJa}　${stat}`;
          option.selected = unit.equipment?.[slot] === item.id;
          select.appendChild(option);
        });

        select.addEventListener('change', () => {
          unit.equipment = { ...unit.equipment, [slot]: select.value || null };
          if (slot === 'weapon') unit.weaponId = select.value || null;
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
          group.appendChild(option);
        });
        abilitySelect.appendChild(group);
      });
      abilitySelect.addEventListener('change', () => { unit.abilityId = abilitySelect.value; });
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

      const note = document.createElement('small');
      note.className = 'formation-note';
      note.textContent = '装備・追加アビリティ・かけらの戦闘効果は順次実装予定';
      info.appendChild(note);
      card.appendChild(info);
      this.containerEl.appendChild(card);
    });
  }
}
