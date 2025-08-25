import type {Reporter} from '@playwright/test/reporter';
import { main} from './report';

class AxeReporter implements Reporter {

    onEnd() {
        main()
    }
}
export default AxeReporter;