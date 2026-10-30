import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'

const source = readFileSync(new URL('../src/lib/torvik.ts', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText
const { predictionFor, liveHomeChance, pregameHomeChance, formatChance } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`)
const prediction = { teams: { '41': { score: 81.7, winProbability: .6 }, '2390': { score: 78.8, winProbability: .4 } } }
const feed = { updatedAt: '2026-11-02T12:00:00Z', games: { '20261102|2390|41': prediction } }
const game = { date: new Date('2026-11-03T01:00:00Z'), away: { id: '41' }, home: { id: '2390' } }
assert.equal(predictionFor(game, feed), prediction, 'UTC midnight must match the Eastern game date')
assert.equal(predictionFor({ ...game, away: game.home, home: game.away }, feed), prediction, 'Neutral site ordering must not swap team predictions')
assert.equal(predictionFor({ ...game, date: new Date('2026-11-04T01:00:00Z') }, feed), undefined)
assert.equal(predictionFor(game), undefined)
assert.equal(predictionFor(game, { ...feed, games: { '20261102|2390|41': { teams: {} } } }), undefined)

const near = (actual, expected, message) => assert.ok(Math.abs(actual - expected) < 0.005, `${message}: ${actual}`)
near(liveHomeChance(0.64, 0, 2400), 0.64, 'Tip-off keeps the pregame chance')
assert.ok(liveHomeChance(0.64, 0, 1200) > 0.55 && liveHomeChance(0.64, 0, 1200) < 0.64, 'A tie at half shrinks the edge')
assert.ok(liveHomeChance(0.64, -10, 1200) < 0.2, 'Down 10 at half is a long shot')
assert.ok(liveHomeChance(0.5, 3, 30) > 0.85, 'Up 3 with 30 seconds left is a strong favorite')
assert.equal(liveHomeChance(0.1, 1, 0), 1, 'Leading at the buzzer wins')
assert.equal(liveHomeChance(0.9, 0, 0), 0.5, 'Tied at the buzzer is a coin flip for overtime')
assert.equal(pregameHomeChance(game, feed).chance, 0.4, 'Torvik chance is for the home team')
near(pregameHomeChance({ ...game, odds: { spread: 0 } }).chance, 0.5, 'A pick-em line is even')
assert.ok(pregameHomeChance({ ...game, odds: { spread: -7 } }).chance > 0.7, 'Home favorite by the line')
assert.equal(pregameHomeChance({ ...game, odds: null }), null)
assert.equal(formatChance(0.001), '<1%')
assert.equal(formatChance(0.999), '>99%')
assert.equal(formatChance(0.644), '64%')
console.log('Torvik matchup/date and win probability validation passed.')
