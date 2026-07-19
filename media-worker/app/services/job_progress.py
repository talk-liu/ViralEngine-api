from collections.abc import Callable


class JobProgressReporter:
    def __init__(self, report: Callable[[int], None], *, step: int = 3) -> None:
        self._report = report
        self._last = -1
        self._step = step

    def update(self, progress: int) -> None:
        progress = max(0, min(100, progress))
        if progress >= self._last + self._step or progress >= 100:
            self._report(progress)
            self._last = progress

    def ratio(self, start: int, end: int) -> Callable[[float], None]:
        span = end - start

        def on_ratio(value: float) -> None:
            self.update(start + int(value * span))

        return on_ratio
