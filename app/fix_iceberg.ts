import fs from 'fs';
import path from 'path';

let content = fs.readFileSync('app/pages/IcebergPage.tsx', 'utf8');

const icebergFix = `  const { data: icebergCagesData, addItem: addCage, updateItem: updateCage, deleteItem: delCage } = useTableSync<any>({
    tableName: 'iceberg_cages',
    storageKey: 'iceberg_cages_data',
    initialData: [],
    orderBy: 'name',
    orderAsc: true
  });
  const icebergCages = icebergCagesData || [];
  
  const { data: transportersData, addItem: addTransporterSync, updateItem: updateTransporterSync, deleteItem: delTransporterSync } = useTableSync<any>({
    tableName: 'transporters',
    storageKey: 'transporters_data',
    initialData: [],
    orderBy: 'name',
    orderAsc: true
  });
  const transporters = transportersData || [];
`;

content = content.replace(/const \[icebergCages, setIcebergCages\] = useState[\s\S]*?;/, icebergFix);
content = content.replace(/const \[transporters, setTransporters\] = useState[\s\S]*?\n\s*\}\);/, '');

content = content.replace(/const saveIcebergCages = \(updated: IcebergCage\[\]\) => \{[^\}]*\};/, '');
content = content.replace(/const saveTransporters = \(updated: \{id: string, name: string\}\[\]\) => \{[^\}]*\};/, '');

content = content.replace(/saveIcebergCages\(\[\.\.\.icebergCages, (\{[^]*?\})\]\);/, 'addCage($1);');
content = content.replace(/saveTransporters\(\[\.\.\.transporters, \{ id: generateId\(\), name: newTransporterName \}\]\);/, 'addTransporterSync({ id: generateId(), name: newTransporterName });');
content = content.replace(/saveIcebergCages\(icebergCages\.filter\(c => c\.id !== cage\.id\)\);/g, 'delCage(cage.id);');
content = content.replace(/saveTransporters\(transporters\.filter\(tr => tr\.id !== t\.id\)\)/g, 'delTransporterSync(t.id)');

fs.writeFileSync('app/pages/IcebergPage.tsx', content, 'utf8');
