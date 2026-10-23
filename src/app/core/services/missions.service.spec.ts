import { rollDailyMissions, MISSION_TEMPLATES } from '../game/missions-catalog';

describe('missions-catalog', () => {
  it('rolls 3 distinct mission types', () => {
    const m = rollDailyMissions();
    expect(m.length).toBe(3);
    const types = new Set(m.map(x => x.type));
    expect(types.size).toBe(3);
  });

  it('picks targets from template triplets', () => {
    const m = rollDailyMissions();
    for (const mission of m) {
      const tpl = MISSION_TEMPLATES.find(t => t.type === mission.type)!;
      expect(tpl.targets).toContain(mission.target);
    }
  });

  it('starts with progress=0 and claimed=false', () => {
    const m = rollDailyMissions();
    for (const mission of m) {
      expect(mission.progress).toBe(0);
      expect(mission.claimed).toBe(false);
    }
  });
});
