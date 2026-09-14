import { fireEvent, render, screen } from '@testing-library/react-native';

import BuilderRoutineName from '@/components/builder/BuilderRoutineName';

describe('BuilderRoutineName', () => {
  it('renames a day to whatever the coach calls it', async () => {
    const onRename = jest.fn();
    await render(<BuilderRoutineName label="Day 2" fallback="Day 2" onRename={onRename} />);

    await fireEvent.changeText(screen.getByTestId('builder-day-name'), 'Upper A');
    await fireEvent(screen.getByTestId('builder-day-name'), 'blur');

    expect(onRename).toHaveBeenCalledWith('Upper A');
  });

  it('trims what was typed', async () => {
    const onRename = jest.fn();
    await render(<BuilderRoutineName label="Day 2" fallback="Day 2" onRename={onRename} />);

    await fireEvent.changeText(screen.getByTestId('builder-day-name'), '  Lower B  ');
    await fireEvent(screen.getByTestId('builder-day-name'), 'blur');

    expect(onRename).toHaveBeenCalledWith('Lower B');
  });

  /** A routine must reach the client with a name, whatever the coach leaves. */
  it('falls back rather than leaving a day nameless', async () => {
    const onRename = jest.fn();
    await render(<BuilderRoutineName label="Upper A" fallback="Day 2" onRename={onRename} />);

    await fireEvent.changeText(screen.getByTestId('builder-day-name'), '   ');
    await fireEvent(screen.getByTestId('builder-day-name'), 'blur');

    expect(onRename).toHaveBeenCalledWith('Day 2');
    expect(screen.getByTestId('builder-day-name').props.value).toBe('Day 2');
  });

  it('writes nothing when the name is unchanged', async () => {
    const onRename = jest.fn();
    await render(<BuilderRoutineName label="Upper A" fallback="Day 1" onRename={onRename} />);

    await fireEvent(screen.getByTestId('builder-day-name'), 'blur');
    expect(onRename).not.toHaveBeenCalled();
  });
});
