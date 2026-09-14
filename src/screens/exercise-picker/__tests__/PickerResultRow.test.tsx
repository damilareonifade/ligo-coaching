import { render, screen, fireEvent } from '@testing-library/react-native';

import type { ApiExerciseOption } from '@/api/types';
import PickerResultRow from '@/screens/exercise-picker/PickerResultRow';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn(), canGoBack: () => true }),
  Link: () => null,
}));

const option: ApiExerciseOption = {
  id: 'wx-0025',
  name: 'Barbell bench press',
  meta: 'Barbell · Chest',
  tag: 'Compound',
  group: 'Chest',
  gifUrl: 'https://cdn.example.com/0025.gif',
};

const onAdd = jest.fn();

beforeEach(() => {
  mockPush.mockClear();
  onAdd.mockClear();
});

describe('PickerResultRow', () => {
  it('shows the animation as a thumbnail', async () => {
    await render(<PickerResultRow option={option} onAdd={onAdd} disabled={false} />);

    expect(screen.getByTestId('picker-thumb-wx-0025')).toBeTruthy();
  });

  /**
   * Animations are fetched on first view, so most of the catalogue starts
   * without one. A tile of the same size keeps the list from sitting unevenly.
   */
  it('falls back to a same-size placeholder when none is stored', async () => {
    await render(
      <PickerResultRow option={{ ...option, gifUrl: null }} onAdd={onAdd} disabled={false} />,
    );

    expect(screen.queryByTestId('picker-thumb-wx-0025')).toBeNull();
    expect(screen.getByTestId('picker-thumb-placeholder-wx-0025')).toBeTruthy();
  });

  /**
   * The row used to add on any tap, which left nowhere to look an exercise up
   * without committing to it — the thing the catalogue exists for.
   */
  it('opens the movement when the row is tapped, without adding it', async () => {
    await render(<PickerResultRow option={option} onAdd={onAdd} disabled={false} />);

    await fireEvent.press(screen.getByTestId('picker-result-wx-0025'));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/exercise/[name]',
      params: { name: 'Barbell bench press', exerciseId: 'wx-0025' },
    });
    expect(onAdd).not.toHaveBeenCalled();
  });

  it('adds it from the plus, without navigating', async () => {
    await render(<PickerResultRow option={option} onAdd={onAdd} disabled={false} />);

    await fireEvent.press(screen.getByTestId('picker-add-wx-0025'));

    expect(onAdd).toHaveBeenCalledWith(option);
    expect(mockPush).not.toHaveBeenCalled();
  });
});
