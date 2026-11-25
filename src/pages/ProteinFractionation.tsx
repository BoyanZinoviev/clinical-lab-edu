import { ModulePage } from '../components/education/ModulePage';
import { ProteinFractionationDiagram } from '../components/visualizations/ProteinFractionationDiagram';
import { proteinFractionationContent } from '../data/content/protein-fractionation';
import { topicById } from '../data/topics';

export default function ProteinFractionation() {
  return <ModulePage topic={topicById('fraktsionirane-belteci')} content={proteinFractionationContent} visualization={<ProteinFractionationDiagram />} />;
}
