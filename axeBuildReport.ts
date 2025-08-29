import type {Reporter} from '@playwright/test/reporter';
import { main} from './buildReport';

class AxeReporter implements Reporter {

    onEnd() {
        main()
    }
}
export default AxeReporter;