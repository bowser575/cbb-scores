import importlib.util
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location('torvik', Path(__file__).with_name('refresh-torvik.py'))
torvik = importlib.util.module_from_spec(spec)
spec.loader.exec_module(torvik)


def row():
    value = [''] * 20
    for index, field in {1: '11/2/26', 8: 'Connecticut', 12: .6, 13: 81.7,
                         14: 'Miami FL', 18: .4, 19: 78.8}.items():
        value[index] = field
    return value


class PredictionsTest(unittest.TestCase):
    def test_aliases_and_scores_preserve_team_identity(self):
        games, missing = torvik.convert([row()], torvik.team_ids())
        self.assertEqual(missing, [])
        self.assertEqual(games['20261102|2390|41']['teams']['41']['score'], 81.7)
        self.assertEqual(games['20261102|2390|41']['teams']['2390']['winProbability'], .4)

    def test_blank_nonfinite_and_invalid_probabilities_are_not_predictions(self):
        for value in ('', None, float('nan'), -1, 2):
            fixture = row()
            fixture[12] = value
            self.assertEqual(torvik.convert([fixture], torvik.team_ids())[0], {})

    def test_unknown_team_is_not_fuzzily_matched(self):
        fixture = row()
        fixture[8] = 'mass-Lowell'
        games, missing = torvik.convert([fixture], torvik.team_ids())
        self.assertEqual(games, {})
        self.assertEqual(missing, ['mass-Lowell'])

    def test_ambiguous_matchups_fail(self):
        with self.assertRaises(ValueError):
            torvik.convert([row(), row()], torvik.team_ids())


if __name__ == '__main__':
    unittest.main()
