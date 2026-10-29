import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'

const source = readFileSync(new URL('../src/lib/torvik.ts', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText
const { predictionFor } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`)
const prediction = { teams: { '41': { score: 81.7, winProbability: .6 }, '2390': { score: 78.8, winProbability: .4 } } }
const feed = { updatedAt: '2026-11-02T12:00:00Z', games: { '20261102|2390|41': prediction } }
const game = { date: new Date('2026-11-03T01:00:00Z'), away: { id: '41' }, home: { id: '2390' } }
assert.equal(predictionFor(game, feed), prediction, 'UTC midnight must match the Eastern game date')
assert.equal(predictionFor({ ...game, away: game.home, home: game.away }, feed), prediction, 'Neutral site ordering must not swap team predictions')
assert.equal(predictionFor({ ...game, date: new Date('2026-11-04T01:00:00Z') }, feed), undefined)
assert.equal(predictionFor(game), undefined)
assert.equal(predictionFor(game, { ...feed, games: { '20261102|2390|41': { teams: {} } } }), undefined)
console.log('Torvik matchup/date validation passed.')
