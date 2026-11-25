import { ModulePage } from '../components/education/ModulePage';
import { CreatinineDiagram } from '../components/visualizations/CreatinineDiagram';
import { creatinineContent } from '../data/content/creatinine';
import { topicById } from '../data/topics';

export default function Creatinine() {
  return <ModulePage topic={topicById('kreatinin')} content={creatinineContent} visualization={<CreatinineDiagram />} />;
}
