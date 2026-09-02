import { fireEvent, render, screen } from '@testing-library/react-native';

import { LIText } from '@/components/ui';

describe('LIText', () => {
  it('renders the text it is given', async () => {
    await render(<LIText text="Coach. Guide. Progress." />);
    expect(screen.getByText('Coach. Guide. Progress.')).toBeTruthy();
  });

  it('calls handleClick when pressed', async () => {
    const handleClick = jest.fn();
    await render(<LIText text="Tap me" handleClick={handleClick} />);

    await fireEvent.press(screen.getByText('Tap me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
