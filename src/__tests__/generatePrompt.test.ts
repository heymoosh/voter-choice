import { describe, it, expect } from 'vitest';
import { generatePrompt } from '../lib/generatePrompt';
import type { StateElectionData } from '../lib/types';
import txData from '../data/states/TX.json';
import caData from '../data/states/CA.json';
import nhData from '../data/states/NH.json';

const today = new Date('2026-02-15T12:00:00');

describe('generatePrompt', () => {
  it('generates prompt with TX state data', () => {
    const prompt = generatePrompt(txData as StateElectionData, '73301', today);
    expect(prompt).toContain('nonpartisan civic research assistant');
    expect(prompt).toContain('Texas');
    expect(prompt).toContain('73301');
    expect(prompt).toContain('2026 Texas Primary Election');
    expect(prompt).toContain('March 3, 2026');
    expect(prompt).toContain('open primary');
    expect(prompt).toContain('Help me with my ballot.');
  });

  it('includes registration deadlines for TX', () => {
    const prompt = generatePrompt(txData as StateElectionData, '73301', today);
    expect(prompt).toContain('Registration deadlines:');
    expect(prompt).toContain('February 2, 2026');
  });

  it('includes early voting info for TX', () => {
    const prompt = generatePrompt(txData as StateElectionData, '73301', today);
    expect(prompt).toContain('Early voting:');
    expect(prompt).toContain('February 17, 2026');
    expect(prompt).toContain('February 28, 2026');
  });

  it('includes voter ID info for TX', () => {
    const prompt = generatePrompt(txData as StateElectionData, '73301', today);
    expect(prompt).toContain('Voter ID:');
    expect(prompt).toContain('Required');
    expect(prompt).toContain("Texas driver's license or ID card");
  });

  it('includes phone policy for TX', () => {
    const prompt = generatePrompt(txData as StateElectionData, '73301', today);
    expect(prompt).toContain('Phones at polls:');
    expect(prompt).toContain('prohibits wireless communication');
  });

  it('includes resource links for TX', () => {
    const prompt = generatePrompt(txData as StateElectionData, '73301', today);
    expect(prompt).toContain('sample ballot');
    expect(prompt).toContain('county election office');
    expect(prompt).toContain('votetexas.gov');
  });

  it('generates prompt with CA state data', () => {
    const prompt = generatePrompt(caData as StateElectionData, '90210', today);
    expect(prompt).toContain('California');
    expect(prompt).toContain('90210');
    expect(prompt).toContain('Same-day registration available');
  });

  it('generates prompt with NH state data (no early voting)', () => {
    const prompt = generatePrompt(nhData as StateElectionData, '03031', today);
    expect(prompt).toContain('New Hampshire');
    expect(prompt).toContain('Not available — absentee voting only');
  });

  it('contains the ballot prompt template', () => {
    const prompt = generatePrompt(txData as StateElectionData, '73301', today);
    expect(prompt).toContain('STEP 1:');
    expect(prompt).toContain('STEP 2:');
    expect(prompt).toContain('STEP 4:');
    expect(prompt).toContain('STEP 6:');
  });

  it('separates prompt from context with divider', () => {
    const prompt = generatePrompt(txData as StateElectionData, '73301', today);
    expect(prompt).toContain('---');
    const parts = prompt.split('---');
    expect(parts.length).toBeGreaterThanOrEqual(2);
  });
});
