import Link from 'next/link'
import { FileText, AlertCircle, CheckCircle, XCircle, Scale, ShieldCheck } from 'lucide-react'

export default function TermsPage() {
  const lastUpdated = "January 2026"

  const sections = [
    {
      icon: CheckCircle,
      title: "Acceptance of Terms",
      content: "By accessing or using BATA, you agree to be bound by these Terms of Service and all applicable laws and regulations. If you do not agree with any of these terms, you are prohibited from using this platform."
    },
    {
      icon: ShieldCheck,
      title: "Eligibility",
      content: "BATA is exclusively for verified students of Nnamdi Azikiwe University (UNIZIK). You must be at least 18 years old to use this platform. You are responsible for providing accurate student verification information."
    }
  ]

  const userResponsibilities = [
    {
      title: "Account Security",
      items: [
        "Keep your password secure and confidential",
        "Notify us immediately of any unauthorized account access",
        "You are responsible for all activities under your account",
        "Do not share your account with others"
      ]
    },
    {
      title: "Prohibited Activities",
      items: [
        "Selling counterfeit, illegal, or prohibited items",
        "Posting false or misleading product information",
        "Harassing, threatening, or defrauding other users",
        "Attempting to manipulate ratings or reviews",
        "Using BATA for any illegal purposes",
        "Creating multiple accounts to bypass restrictions"
      ]
    },
    {
      title: "Product Listings",
      items: [
        "Provide accurate descriptions and images",
        "Set fair and honest prices",
        "Honor your listed prices and availability",
        "Respond promptly to buyer inquiries",
        "Ship items as described within agreed timeframes"
      ]
    },
    {
      title: "Buying Obligations",
      items: [
        "Pay for items promptly after purchase",
        "Provide accurate delivery information",
        "Inspect items upon delivery",
        "Report issues within 7 days of delivery",
        "Treat sellers and riders with respect"
      ]
    }
  ]

  const platformPolicies = [
    {
      title: "Payment & Escrow",
      points: [
        "All payments are processed through secure payment gateways",
        "Funds are held in escrow until delivery confirmation",
        "Sellers receive payment after successful delivery",
        "Refunds are processed according to our dispute resolution policy",
        "BATA charges a 10% commission on completed sales"
      ]
    },
    {
      title: "Delivery & Shipping",
      points: [
        "Delivery is facilitated by verified BATA riders",
        "Standard delivery fee is ₦800 per order",
        "Most deliveries completed within 2-6 hours",
        "Sellers must package items securely",
        "Buyers must be available to receive deliveries"
      ]
    },
    {
      title: "Reviews & Ratings",
      points: [
        "Only verified buyers can leave product reviews",
        "Reviews must be honest and based on actual experience",
        "Fake or paid reviews are prohibited",
        "Offensive or inappropriate reviews will be removed",
        "Sellers cannot remove negative but legitimate reviews"
      ]
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-bata-primary to-bata-dark text-white py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center space-x-2 bg-white/20 px-4 py-2 rounded-full mb-6">
            <FileText className="w-5 h-5" />
            <span className="font-semibold">Terms of Service</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            Terms & Conditions
          </h1>
          <p className="text-xl text-white/90 max-w-2xl mx-auto">
            Please read these terms carefully before using BATA. They outline your rights and 
            responsibilities as a member of our community.
          </p>
          <p className="text-sm text-white/75 mt-6">
            Last Updated: {lastUpdated}
          </p>
        </div>
      </section>

      {/* Introduction */}
      <section className="py-12 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="bg-blue-50 border-l-4 border-blue-500 p-6 rounded-r-xl">
            <h2 className="text-xl font-bold text-blue-900 mb-3">
              📋 Agreement to Terms
            </h2>
            <p className="text-gray-700 leading-relaxed">
              These Terms of Service ("Terms") govern your use of BATA, the student-to-student 
              marketplace platform for Nnamdi Azikiwe University (UNIZIK) students. By creating 
              an account or using our services, you enter into a legally binding agreement with us.
            </p>
          </div>
        </div>
      </section>

      {/* Main Sections */}
      <section className="py-12 px-4">
        <div className="max-w-4xl mx-auto space-y-8">
          {sections.map((section, index) => (
            <div key={index} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-bata-light to-white p-6 border-b border-gray-100">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-bata-primary to-bata-dark rounded-xl flex items-center justify-center flex-shrink-0">
                    <section.icon className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {section.title}
                  </h2>
                </div>
              </div>
              <div className="p-6">
                <p className="text-gray-700 leading-relaxed">
                  {section.content}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* User Responsibilities */}
      <section className="py-12 px-4 bg-gradient-to-br from-gray-50 to-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Your Responsibilities
            </h2>
            <p className="text-gray-600">
              As a BATA user, you agree to the following obligations
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {userResponsibilities.map((section, index) => (
              <div key={index} className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow duration-300">
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Scale className="w-5 h-5 text-bata-primary" />
                  {section.title}
                </h3>
                <ul className="space-y-2">
                  {section.items.map((item, itemIndex) => (
                    <li key={itemIndex} className="flex items-start gap-2 text-gray-700">
                      <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-sm">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Platform Policies */}
      <section className="py-12 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Platform Policies
            </h2>
            <p className="text-gray-600">
              Key policies governing how BATA operates
            </p>
          </div>

          <div className="space-y-6">
            {platformPolicies.map((policy, index) => (
              <div key={index} className="bg-gradient-to-br from-gray-50 to-white rounded-2xl border border-gray-100 p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">
                  {policy.title}
                </h3>
                <ul className="space-y-2">
                  {policy.points.map((point, pointIndex) => (
                    <li key={pointIndex} className="flex items-start gap-2 text-gray-700">
                      <span className="text-bata-primary font-bold mt-1">•</span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Account Termination */}
      <section className="py-12 px-4 bg-gradient-to-br from-gray-50 to-white">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl border border-red-200 p-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                <XCircle className="w-7 h-7 text-red-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">
                Account Suspension & Termination
              </h2>
            </div>
            <div className="space-y-4 text-gray-700">
              <p>
                BATA reserves the right to suspend or terminate accounts that violate these Terms. 
                Violations include but are not limited to:
              </p>
              <ul className="space-y-2 pl-6">
                <li className="flex items-start gap-2">
                  <span className="text-red-500">•</span>
                  <span>Selling prohibited or illegal items</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500">•</span>
                  <span>Fraudulent activities or scamming other users</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500">•</span>
                  <span>Harassment or abusive behavior toward others</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500">•</span>
                  <span>Multiple violations of platform policies</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500">•</span>
                  <span>Attempting to circumvent platform fees or rules</span>
                </li>
              </ul>
              <p className="font-semibold">
                Suspended accounts may lose access to funds in escrow and pending balances.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Intellectual Property */}
      <section className="py-12 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="bg-purple-50 border-l-4 border-purple-500 p-6 rounded-r-xl">
            <h3 className="text-xl font-bold text-purple-900 mb-3">
              📝 Intellectual Property
            </h3>
            <div className="text-gray-700 space-y-2">
              <p>
                All content on BATA, including the logo, design, text, graphics, and software, is owned by 
                BATA or its licensors and protected by copyright and trademark laws.
              </p>
              <p>
                You retain ownership of content you upload (product listings, photos, descriptions) but 
                grant BATA a license to use this content to operate and promote the platform.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Limitation of Liability */}
      <section className="py-12 px-4 bg-gradient-to-br from-gray-50 to-white">
        <div className="max-w-4xl mx-auto">
          <div className="bg-yellow-50 border-l-4 border-yellow-500 p-6 rounded-r-xl">
            <h3 className="text-xl font-bold text-yellow-900 mb-3">
              ⚠️ Limitation of Liability
            </h3>
            <div className="text-gray-700 space-y-2">
              <p>
                BATA provides a platform for students to trade but does not guarantee the quality, safety, 
                or legality of items listed. We are not responsible for:
              </p>
              <ul className="pl-6 space-y-1">
                <li>• Quality or condition of products sold</li>
                <li>• Accuracy of seller descriptions</li>
                <li>• Actions or conduct of users</li>
                <li>• Lost or stolen items during delivery</li>
                <li>• Service interruptions or technical issues</li>
              </ul>
              <p className="font-semibold mt-4">
                BATA's total liability is limited to the amount of fees paid to us in the past 12 months.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Changes to Terms */}
      <section className="py-12 px-4 bg-gradient-to-br from-gray-50 to-white">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              📢 Changes to These Terms
            </h2>
            <p className="text-gray-700 leading-relaxed">
              We may modify these Terms at any time. We will notify users of significant changes via 
              email or platform notification. Continued use of BATA after changes constitutes acceptance 
              of the revised Terms. If you do not agree to the changes, you must stop using the platform.
            </p>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-16 px-4 bg-gradient-to-br from-bata-primary to-bata-dark text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">
            Questions About These Terms?
          </h2>
          <p className="text-xl text-white/90 mb-8">
            If you have any questions or concerns about these Terms of Service, please contact us.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a 
              href="mailto:support@bata.com"
              className="bg-white text-bata-primary hover:bg-gray-100 px-8 py-4 rounded-xl font-bold text-lg transition-all shadow-lg hover:shadow-xl"
            >
              Email: support@bata.com
            </a>
            <Link 
              href="/contact"
              className="bg-bata-dark/50 hover:bg-bata-dark text-white border-2 border-white px-8 py-4 rounded-xl font-bold text-lg transition-all"
            >
              Contact Support
            </Link>
          </div>
          <p className="text-sm text-white/75 mt-8">
            By using BATA, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.
          </p>
        </div>
      </section>
    </div>
  )
}