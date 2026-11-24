import { ModulePage } from '../components/education/ModulePage';
import { QCDiagram, AccuracyPrecision } from '../components/visualizations/QCDiagram';
import { qualityControlContent } from '../data/content/qualityControl';
import { topicById } from '../data/topics';

export default function QualityControl() {
  return (
    <ModulePage
      topic={topicById('kachestven-kontrol')}
      content={qualityControlContent}
      visualization={
        <>
        <QCDiagram />
        <AccuracyPrecision />
        </>
      }
    />
  );
}
