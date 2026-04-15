import Header from '../components/layout/Header';
import NOCUpload from '../components/noc/NOCUpload';
import EncryptionBadge from '../components/common/EncryptionBadge';

export default function UploadPage() {
  return (
    <div className="upload-page">
      <Header
        title="Upload NOC Document"
        subtitle="Upload a Fire NOC PDF — the system will extract and save all building data automatically"
      />
      <EncryptionBadge />
      <NOCUpload />
    </div>
  );
}
