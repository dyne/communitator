
import EndpointEditor from './EndpointEditor';
const RelayList = ({ relays, onUpdate, onRemove, onTouched, errors }) => <div className="relay-list">{relays.map((relay, index) => <EndpointEditor key={relay.id} endpoint={relay} group="relay" index={index} relay removable={relays.length > 1} onUpdate={onUpdate} onRemove={onRemove} onTouched={onTouched} error={errors.get(relay.id)} />)}</div>;

export default RelayList;
