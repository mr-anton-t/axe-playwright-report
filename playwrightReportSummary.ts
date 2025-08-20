import {Reporter} from '@playwright/test/reporter';
import main from './buildReport';

class PlaywrightAxeReport implements Reporter {
  async onEnd() {
    main();
  }
}
